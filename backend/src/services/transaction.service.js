const TransactionError = require("../errors/transaction.error")
const { PaymeError, PaymeData, TransactionState } = require("../enum/transaction.enum")
const { db } = require('./firebase');

class TransactionService {
  async checkPerformTransaction(params, id) {
    const { account, amount: rawAmount } = params
    const amount = Math.floor(rawAmount / 100)

    const userRef = db.collection("users").doc(account.user_id)
    const userSnap = await userRef.get()
    if (!userSnap.exists) {
      throw new TransactionError(PaymeError.UserNotFound, id, PaymeData.UserId)
    }

    const productRef = db.collection("products").doc(account.product_id)
    const productSnap = await productRef.get()
    if (!productSnap.exists) {
      throw new TransactionError(PaymeError.ProductNotFound, id, PaymeData.ProductId)
    }

    const product = productSnap.data()
    if (amount !== product.price) {
      throw new TransactionError(PaymeError.InvalidAmount, id)
    }
  }

  async checkTransaction(params, id) {
    const txSnap = await db.collection("transactions").doc(params.id).get()
    if (!txSnap.exists) {
      throw new TransactionError(PaymeError.TransactionNotFound, id)
    }

    const tx = txSnap.data()
    return {
      create_time: tx.create_time,
      perform_time: tx.perform_time,
      cancel_time: tx.cancel_time,
      transaction: tx.id,
      state: tx.state,
      reason: tx.reason,
    }
  }

  async createTransaction(params, id) {
    const { account, time, amount: rawAmount } = params
    const amount = Math.floor(rawAmount / 100)

    await this.checkPerformTransaction(params, id)

    const txRef = db.collection("transactions").doc(id)
    const txSnap = await txRef.get()

    if (txSnap.exists) {
      const tx = txSnap.data()
      if (tx.state !== TransactionState.Pending) {
        throw new TransactionError(PaymeError.CantDoOperation, id)
      }

      const expired = (Date.now() - tx.create_time) / 60000 >= 12
      if (expired) {
        await txRef.update({ state: TransactionState.PendingCanceled, reason: 4 })
        throw new TransactionError(PaymeError.CantDoOperation, id)
      }

      return {
        create_time: tx.create_time,
        transaction: id,
        state: TransactionState.Pending,
      }
    }

    // Check duplicate
    const existingQuery = await db.collection("transactions")
      .where("user", "==", account.user_id)
      .where("product", "==", account.product_id)
      .where("provider", "==", "payme")
      .limit(1)
      .get()

    if (!existingQuery.empty) {
      const existingTx = existingQuery.docs[0].data()
      if (existingTx.state === TransactionState.Paid)
        throw new TransactionError(PaymeError.AlreadyDone, id)
      if (existingTx.state === TransactionState.Pending)
        throw new TransactionError(PaymeError.Pending, id)
    }

    await txRef.set({
      id,
      state: TransactionState.Pending,
      amount,
      user: account.user_id,
      product: account.product_id,
      create_time: time,
      provider: "payme",
    })

    return {
      transaction: id,
      state: TransactionState.Pending,
      create_time: time,
    }
  }

  async performTransaction(params, id) {
    const currentTime = Date.now()
    const txRef = db.collection("transactions").doc(id)
    const txSnap = await txRef.get()

    if (!txSnap.exists) {
      throw new TransactionError(PaymeError.TransactionNotFound, id)
    }

    const tx = txSnap.data()

    if (tx.state !== TransactionState.Pending) {
      if (tx.state !== TransactionState.Paid) {
        throw new TransactionError(PaymeError.CantDoOperation, id)
      }
      return {
        perform_time: tx.perform_time,
        transaction: id,
        state: TransactionState.Paid,
      }
    }

    const expired = (currentTime - tx.create_time) / 60000 >= 12
    if (expired) {
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
      transaction: id,
      state: TransactionState.Paid,
    }
  }

  async cancelTransaction(params, id) {
    const txRef = db.collection("transactions").doc(id)
    const txSnap = await txRef.get()

    if (!txSnap.exists) {
      throw new TransactionError(PaymeError.TransactionNotFound, id)
    }

    const tx = txSnap.data()
    const currentTime = Date.now()

    if (tx.state > 0) {
      await txRef.update({
        state: -Math.abs(tx.state),
        reason: params.reason,
        cancel_time: currentTime,
      })
    }

    return {
      cancel_time: tx.cancel_time || currentTime,
      transaction: id,
      state: -Math.abs(tx.state),
    }
  }

  async cancelTransaction(transactionId) {
    console.log('cancelTransaction called with transactionId:', transactionId); // Add logging

    if (!transactionId || typeof transactionId !== 'string' || transactionId.trim() === '') {
        throw new Error('Invalid transactionId: must be a non-empty string');
    }

    const transactionDoc = this.firestore.collection('transactions').doc(transactionId);

    // Proceed with the rest of the logic
    const transaction = await transactionDoc.get();
    if (!transaction.exists) {
        throw new Error('Transaction not found');
    }

    // Additional cancellation logic...
  }

  async getStatement(params) {
    const { from, to } = params
    const txs = await db.collection("transactions")
      .where("create_time", ">=", from)
      .where("create_time", "<=", to)
      .where("provider", "==", "payme")
      .get()

    return txs.docs.map(doc => {
      const tx = doc.data()
      return {
        id: tx.id,
        time: tx.create_time,
        amount: tx.amount,
        account: {
          user_id: tx.user,
          product_id: tx.product,
        },
        create_time: tx.create_time,
        perform_time: tx.perform_time,
        cancel_time: tx.cancel_time,
        transaction: tx.id,
        state: tx.state,
        reason: tx.reason,
      }
    })
  }
}

module.exports = new TransactionService()
