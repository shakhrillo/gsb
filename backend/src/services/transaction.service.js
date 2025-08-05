const TransactionError = require('../errors/transaction.error')
const { PaymeError, PaymeData, TransactionState } = require('../enum/transaction.enum')
const { db } = require('./firebase');
const PAYME_MERCHANT_ID = process.env.PAYME_MERCHANT_ID
const base64 = require('base-64')

class TransactionService {
  async checkPerformTransaction(params, id) {
    let { account, amount } = params

    if (!account.user_id) {
      throw new TransactionError(PaymeError.UserNotFound, id, PaymeData.UserId)
    }
    if (!account.product_id) {
      throw new TransactionError(PaymeError.ProductNotFound, id, PaymeData.ProductId)
    }

    // amount = Math.floor(amount / 100)
    
    const userRef = db.collection("users").doc(account.user_id)
    const userSnap = await userRef.get()
    if (!userSnap.exists) {
      throw new TransactionError(PaymeError.UserNotFound, id, PaymeData.UserId)
    }
    
    const productRef = db.collection("orders").doc(account.product_id)
    const productSnap = await productRef.get()
    if (!productSnap.exists) {
      throw new TransactionError(PaymeError.ProductNotFound, id, PaymeData.ProductId)
    }
    
    const product = productSnap.data()
    if (amount !== product.price) {
      throw new TransactionError(PaymeError.InvalidAmount, id)
    }

    // return product['detail'] || null
    return {
      "receipt_type": 0, //тип фискального чека
      "shipping" : { //доставка, необязательное поле
        "title" : "Test delivery",
        "price" : 0
      },
      "items" : (product['items'] || []).map(item => {
        return {
          "discount": item['discount'] || 0,
          "title": item['name'] || "Unknown",
          "price": item['price'] || 0,
          "count": item['quantity'] || 1,
          "code": item['mxikCode'] || "00000000000000000",
          "vat_percent": item['vat'] || 12,
          "package_code": item["packageType"] || "00000000000000000",
        }
      })
    }
  }

  async checkTransaction(params, id) {
    const transactionRef = db.collection("transactions").doc(params.id)
    const transactionSnap = await transactionRef.get()
    
    if (!transactionSnap.exists) {
      throw new TransactionError(PaymeError.TransactionNotFound, id)
    }
    
    const transaction = transactionSnap.data()
    return {
      create_time: transaction.create_time,
      perform_time: transaction.perform_time,
      cancel_time: transaction.cancel_time,
      transaction: transaction.id,
      state: transaction.state,
      reason: transaction.reason,
    }
  }

  async createTransaction(params, id) {
    let { account, time, amount } = params

    amount = Math.floor(amount / 100)

    await this.checkPerformTransaction(params, id)

    const transactionRef = db.collection("transactions").doc(params.id)
    const transactionSnap = await transactionRef.get()
    
    if (transactionSnap.exists) {
      const transaction = transactionSnap.data()
      if (transaction.state !== TransactionState.Pending) {
        throw new TransactionError(PaymeError.CantDoOperation, id)
      }
      const currentTime = Date.now()
      const expirationTime = (currentTime - transaction.create_time) / 60000 < 12
      if (!expirationTime) {
        await transactionRef.update({ 
          state: TransactionState.PendingCanceled, 
          reason: 4,
          cancel_time: currentTime
        })
        throw new TransactionError(PaymeError.CantDoOperation, id)
      }
      return {
        create_time: transaction.create_time,
        transaction: transaction.id,
        state: TransactionState.Pending,
      }
    }

    // Check for existing transaction with same user and product
    const existingTxQuery = await db.collection("transactions")
      .where("user", "==", account.user_id)
      .where("product", "==", account.product_id)
      .where("provider", "==", "payme")
      .get()

    if (!existingTxQuery.empty) {
      for (const doc of existingTxQuery.docs) {
        const transaction = doc.data()
        // Skip the current transaction being created
        if (transaction.id === params.id) continue
        
        if (transaction.state === TransactionState.Paid) {
          throw new TransactionError(PaymeError.AlreadyDone, id)
        }
        if (transaction.state === TransactionState.Pending) {
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

    await transactionRef.set(newTransaction)

    return {
      transaction: newTransaction.id,
      state: TransactionState.Pending,
      create_time: newTransaction.create_time,
    }
  }
  
  async performTransaction(params, id) {
    const currentTime = Date.now()
    
    const txRef = db.collection("transactions").doc(params.id)
    const txSnap = await txRef.get()

    if (!txSnap.exists) {
      throw new TransactionError(PaymeError.TransactionNotFound, id)
    }

    const transaction = txSnap.data()

    if (transaction.state !== TransactionState.Pending) {
      if (transaction.state !== TransactionState.Paid) {
        throw new TransactionError(PaymeError.CantDoOperation, id)
      }
      return {
        perform_time: transaction.perform_time,
        transaction: transaction.id,
        state: TransactionState.Paid,
      }
    }
    
    const expirationTime = (currentTime - transaction.create_time) / 60000 < 12
    if (!expirationTime) {
      await txRef.update({
        state: TransactionState.PendingCanceled,
        reason: 4,
        cancel_time: currentTime,
      })
      throw new TransactionError(PaymeError.CantDoOperation, id)
    }

    await txRef.update({
      state: TransactionState.Paid,
      perform_time: currentTime,
    })

    return {
      perform_time: currentTime,
      transaction: transaction.id,
      state: TransactionState.Paid,
    }
  }

  async cancelTransaction(params, id) {
    const txRef = db.collection("transactions").doc(params.id)
    const txSnap = await txRef.get()

    if (!txSnap.exists) {
      throw new TransactionError(PaymeError.TransactionNotFound, id)
    }

    const transaction = txSnap.data()
    const currentTime = Date.now()

    if (transaction.state > 0) {
      await txRef.update({
        state: -Math.abs(transaction.state),
        reason: params.reason,
        cancel_time: currentTime,
      })
    }

    return {
      cancel_time: transaction.cancel_time || currentTime,
      transaction: transaction.id,
      state: -Math.abs(transaction.state),
    }
  }

  async getStatement(params) {
    const { from, to } = params
    const txs = await db.collection("transactions")
      .where("create_time", ">=", from)
      .where("create_time", "<=", to)
      .where("provider", "==", "payme")
      .get()

    return txs.docs.map(doc => {
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
  }

  async checkout({
    user_id,
    product_id,
    amount
  }) {

    console.log('Checkout params:', { PAYME_MERCHANT_ID, user_id, product_id, amount })
    // return {}

    // console.log('Checkout params:', params)

    // if (!account.user_id) {
    //   throw new TransactionError(PaymeError.UserNotFound, id, PaymeData.UserId)
    // }
    // if (!account.product_id) {
    //   throw new TransactionError(PaymeError.ProductNotFound, id, PaymeData.ProductId)
    // }

    // const productRef = db.collection("products").doc(account.product_id)
    // const productSnap = await productRef.get()
    
    // if (!productSnap.exists) {
    //   throw new TransactionError(PaymeError.ProductNotFound, id, PaymeData.ProductId)
    // }

    // const product = productSnap.data()
    // if (amount !== product.price) {
    //   throw new TransactionError(PaymeError.InvalidAmount, id)
    // }
    amount = Math.floor(amount * 100)

    // base64(m=587f72c72cac0d162c722ae2;ac.order_id=197;a=500)
    const r = base64.encode(`m=${PAYME_MERCHANT_ID};ac.user_id=${user_id};ac.product_id=${product_id};a=${amount}`)
    return {
      url: `https://checkout.paycom.uz/${r}`,
    }
  }
}

module.exports = new TransactionService()
