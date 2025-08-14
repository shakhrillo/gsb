const TransactionError = require('../errors/transaction.error')
const { PaymeError, PaymeData, TransactionState } = require('../enum/transaction.enum')
const { db } = require('./firebase');
const PAYME_MERCHANT_ID = process.env.PAYME_MERCHANT_ID
const base64 = require('base-64')

class TransactionService {
  async checkPerformTransaction(params, id) {
    console.log('🔍 [DEBUG] checkPerformTransaction called with params:', JSON.stringify(params), 'id:', id)
    let { account, amount } = params

    if (!account.user_id) {
      console.log('❌ [DEBUG] User ID not found in account:', account)
      throw new TransactionError(PaymeError.UserNotFound, id, PaymeData.UserId)
    }
    if (!account.product_id) {
      console.log('❌ [DEBUG] Product ID not found in account:', account)
      throw new TransactionError(PaymeError.ProductNotFound, id, PaymeData.ProductId)
    }

    // amount = Math.floor(amount / 100)
    console.log('💰 [DEBUG] Amount to validate:', amount)
    
    const userRef = db.collection("users").doc(account.user_id)
    console.log('👤 [DEBUG] Fetching user with ID:', account.user_id)
    const userSnap = await userRef.get()
    if (!userSnap.exists) {
      console.log('❌ [DEBUG] User not found in database:', account.user_id)
      throw new TransactionError(PaymeError.UserNotFound, id, PaymeData.UserId)
    }
    console.log('✅ [DEBUG] User found:', userSnap.data()?.name || 'Unknown name')
    
    const productRef = db.collection("orders").doc(account.product_id)
    console.log('📦 [DEBUG] Fetching product/order with ID:', account.product_id)
    const productSnap = await productRef.get()
    if (!productSnap.exists) {
      console.log('❌ [DEBUG] Product/order not found in database:', account.product_id)
      throw new TransactionError(PaymeError.ProductNotFound, id, PaymeData.ProductId)
    }
    
    const product = productSnap.data()
    console.log('📦 [DEBUG] Product/order data:', JSON.stringify(product))
    console.log('💰 [DEBUG] Price comparison - expected:', product.price, 'received:', amount)
    if (amount !== product.price) {
      console.log('❌ [DEBUG] Amount mismatch - expected:', product.price, 'received:', amount)
      throw new TransactionError(PaymeError.InvalidAmount, id)
    }

    // return product['detail'] || null
    const receiptData = {
      "receipt_type": 0, //тип фискального чека
      "shipping" : { //доставка, необязательное поле
        "title" : `${item?.['deliveryLocation']?.['address']}`,
        "price" : item?.['deliveryFee']
      },
      "items" : (product['items'] || []).map(item => {
        return {
          "discount": item['discount'] || 0,
          "title": item['name'],
          "price": item['price'],
          "count": item['quantity'],
          "code": item['mxikCode'],
          "vat_percent": item['vat'],
          "package_code": item["packageType"],
        }
      })
    }
    console.log('🧾 [DEBUG] Generated receipt data:', JSON.stringify(receiptData))
    return receiptData
  }

  async checkTransaction(params, id) {
    console.log('🔍 [DEBUG] checkTransaction called with params:', JSON.stringify(params), 'id:', id)
    const transactionRef = db.collection("transactions").doc(params.id)
    const transactionSnap = await transactionRef.get()
    
    if (!transactionSnap.exists) {
      console.log('❌ [DEBUG] Transaction not found:', params.id)
      throw new TransactionError(PaymeError.TransactionNotFound, id)
    }
    
    const transaction = transactionSnap.data()
    console.log('✅ [DEBUG] Transaction found:', JSON.stringify(transaction))
    const result = {
      create_time: transaction.create_time,
      perform_time: transaction.perform_time,
      cancel_time: transaction.cancel_time,
      transaction: transaction.id,
      state: transaction.state,
      reason: transaction.reason,
    }
    console.log('📤 [DEBUG] checkTransaction result:', JSON.stringify(result))
    return result
  }

  async createTransaction(params, id) {
    console.log('🆕 [DEBUG] createTransaction called with params:', JSON.stringify(params), 'id:', id)
    let { account, time, amount } = params

    console.log('💰 [DEBUG] Original amount:', amount)
    amount = Math.floor(amount / 100)
    console.log('💰 [DEBUG] Amount after division by 100:', amount)

    await this.checkPerformTransaction(params, id)

    const transactionRef = db.collection("transactions").doc(params.id)
    const transactionSnap = await transactionRef.get()
    
    if (transactionSnap.exists) {
      console.log('⚠️ [DEBUG] Transaction already exists, checking state')
      const transaction = transactionSnap.data()
      console.log('📊 [DEBUG] Existing transaction state:', transaction.state)
      if (transaction.state !== TransactionState.Pending) {
        console.log('❌ [DEBUG] Cannot perform operation - transaction state is not pending')
        throw new TransactionError(PaymeError.CantDoOperation, id)
      }
      const currentTime = Date.now()
      const expirationTime = (currentTime - transaction.create_time) / 60000 < 12
      console.log('⏰ [DEBUG] Transaction age in minutes:', (currentTime - transaction.create_time) / 60000)
      console.log('⏰ [DEBUG] Is transaction still valid (< 12 min):', expirationTime)
      if (!expirationTime) {
        console.log('⏰ [DEBUG] Transaction expired, canceling')
        await transactionRef.update({ 
          state: TransactionState.PendingCanceled, 
          reason: 4,
          cancel_time: currentTime
        })
        throw new TransactionError(PaymeError.CantDoOperation, id)
      }
      const result = {
        create_time: transaction.create_time,
        transaction: transaction.id,
        state: TransactionState.Pending,
      }
      console.log('📤 [DEBUG] Returning existing transaction:', JSON.stringify(result))
      return result
    }

    // Check for existing transaction with same user and product
    console.log('🔍 [DEBUG] Checking for existing transactions with same user and product')
    const existingTxQuery = await db.collection("transactions")
      .where("user", "==", account.user_id)
      .where("product", "==", account.product_id)
      .where("provider", "==", "payme")
      .get()

    console.log('📊 [DEBUG] Found', existingTxQuery.size, 'existing transactions')
    if (!existingTxQuery.empty) {
      for (const doc of existingTxQuery.docs) {
        const transaction = doc.data()
        console.log('🔍 [DEBUG] Checking existing transaction:', transaction.id, 'state:', transaction.state)
        // Skip the current transaction being created
        if (transaction.id === params.id) continue
        
        if (transaction.state === TransactionState.Paid) {
          console.log('❌ [DEBUG] Transaction already paid')
          throw new TransactionError(PaymeError.AlreadyDone, id)
        }
        if (transaction.state === TransactionState.Pending) {
          console.log('❌ [DEBUG] Transaction already pending')
          throw new TransactionError(PaymeError.Pending, id)
        }
      }
    }

    const newTransaction = {
      id: params.id,
      state: TransactionState.Pending,
      amount,
      user: account.user_id,
      product: account.product_id,
      create_time: time,
      provider: 'payme',
      perform_time: 0,
      cancel_time: 0,
      reason: null
    }

    console.log('💾 [DEBUG] Creating new transaction:', JSON.stringify(newTransaction))
    await transactionRef.set(newTransaction)

    const result = {
      transaction: newTransaction.id,
      state: TransactionState.Pending,
      create_time: newTransaction.create_time,
    }
    console.log('📤 [DEBUG] createTransaction result:', JSON.stringify(result))
    return result
  }
  
  async performTransaction(params, id) {
    console.log('⚡ [DEBUG] performTransaction called with params:', JSON.stringify(params), 'id:', id)
    const currentTime = Date.now()
    console.log('⏰ [DEBUG] Current time:', currentTime)
    
    const txRef = db.collection("transactions").doc(params.id)
    const txSnap = await txRef.get()

    if (!txSnap.exists) {
      console.log('❌ [DEBUG] Transaction not found:', params.id)
      throw new TransactionError(PaymeError.TransactionNotFound, id)
    }

    const transaction = txSnap.data()
    console.log('📊 [DEBUG] Transaction state:', transaction.state, 'Expected pending state:', TransactionState.Pending)

    if (transaction.state !== TransactionState.Pending) {
      if (transaction.state !== TransactionState.Paid) {
        console.log('❌ [DEBUG] Cannot perform operation - invalid state:', transaction.state)
        throw new TransactionError(PaymeError.CantDoOperation, id)
      }
      console.log('✅ [DEBUG] Transaction already paid, returning existing result')
      const result = {
        perform_time: transaction.perform_time,
        transaction: transaction.id,
        state: TransactionState.Paid,
      }
      console.log('📤 [DEBUG] performTransaction result (already paid):', JSON.stringify(result))
      return result
    }
    
    const transactionAge = (currentTime - transaction.create_time) / 60000
    const expirationTime = transactionAge < 12
    console.log('⏰ [DEBUG] Transaction age in minutes:', transactionAge)
    console.log('⏰ [DEBUG] Is transaction still valid (< 12 min):', expirationTime)
    if (!expirationTime) {
      console.log('⏰ [DEBUG] Transaction expired, canceling')
      await txRef.update({
        state: TransactionState.PendingCanceled,
        reason: 4,
        cancel_time: currentTime,
      })
      throw new TransactionError(PaymeError.CantDoOperation, id)
    }

    console.log('💾 [DEBUG] Updating transaction to paid state')
    await txRef.update({
      state: TransactionState.Paid,
      perform_time: currentTime,
    })

    const result = {
      perform_time: currentTime,
      transaction: transaction.id,
      state: TransactionState.Paid,
    }
    console.log('📤 [DEBUG] performTransaction result:', JSON.stringify(result))
    return result
  }

  async cancelTransaction(params, id) {
    console.log('❌ [DEBUG] cancelTransaction called with params:', JSON.stringify(params), 'id:', id)
    const txRef = db.collection("transactions").doc(params.id)
    const txSnap = await txRef.get()

    if (!txSnap.exists) {
      console.log('❌ [DEBUG] Transaction not found:', params.id)
      throw new TransactionError(PaymeError.TransactionNotFound, id)
    }

    const transaction = txSnap.data()
    console.log('📊 [DEBUG] Transaction data:', JSON.stringify(transaction))
    const currentTime = Date.now()

    console.log('📊 [DEBUG] Transaction state before cancel:', transaction.state)
    if (transaction.state > 0) {
      const newState = -Math.abs(transaction.state)
      console.log('💾 [DEBUG] Updating transaction state from', transaction.state, 'to', newState)
      await txRef.update({
        state: newState,
        reason: params.reason,
        cancel_time: currentTime,
      })
    }

    const result = {
      cancel_time: transaction.cancel_time || currentTime,
      transaction: transaction.id,
      state: -Math.abs(transaction.state),
    }
    console.log('📤 [DEBUG] cancelTransaction result:', JSON.stringify(result))
    return result
  }

  async getStatement(params) {
    console.log('📊 [DEBUG] getStatement called with params:', JSON.stringify(params))
    const { from, to } = params
    console.log('📅 [DEBUG] Date range - from:', from, 'to:', to)
    
    const txs = await db.collection("transactions")
      .where("create_time", ">=", from)
      .where("create_time", "<=", to)
      .where("provider", "==", "payme")
      .get()

    console.log('📊 [DEBUG] Found', txs.size, 'transactions in the specified range')
    
    const result = txs.docs.map(doc => {
      const transaction = doc.data()
      return {
        id: transaction.id,
        time: transaction.create_time,
        amount: transaction.amount,
        account: {
          user_id: transaction.user,
          product_id: transaction.product,
        },
        create_time: transaction.create_time,
        perform_time: transaction.perform_time,
        cancel_time: transaction.cancel_time,
        transaction: transaction.id,
        state: transaction.state,
        reason: transaction.reason,
      }
    })
    
    console.log('📤 [DEBUG] getStatement result count:', result.length)
    console.log('📤 [DEBUG] getStatement sample result:', result.length > 0 ? JSON.stringify(result[0]) : 'No transactions found')
    return result
  }

  async checkout({
    user_id,
    product_id,
    amount
  }) {
    amount = Math.floor(amount * 100)
    const r = base64.encode(`m=${PAYME_MERCHANT_ID};ac.user_id=${user_id};ac.product_id=${product_id};a=${amount}`)
    return {
      url: `https://checkout.paycom.uz/${r}`,
    }
  }
}

module.exports = new TransactionService()
