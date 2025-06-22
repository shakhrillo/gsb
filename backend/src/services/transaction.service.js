const TransactionError = require("../errors/transaction.error")
const { PaymeError, PaymeData, TransactionState } = require("../enum/transaction.enum")
const { db } = require('./firebase');

class TransactionService {
  async checkPerformTransaction(params, id) {
    const { account, amount: rawAmount } = params

    if (!account.user_id) {
			throw new TransactionError(PaymeError.UserNotFound, id, PaymeData.UserId)
		}
		if (!account.product_id) {
			throw new TransactionError(PaymeError.ProductNotFound, id, PaymeData.ProductId)
		}

    const amount = Math.floor(rawAmount)

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
		// const transaction = await transactionModel.findOne({ id: params.id })
    const transactionRef = db.collection("transactions").doc(params.id)
    const transactionSnap = await transactionRef.get()
    const transaction = transactionSnap.exists ? transactionSnap.data() : null
		
    if (!transaction) {
			throw new TransactionError(PaymeError.TransactionNotFound, id)
		}

		return {
			create_time: transaction.create_time || 0,
			perform_time: transaction.perform_time || 0,
			cancel_time: transaction.cancel_time || 0,
			transaction: transaction.id,
			state: transaction.state,
			reason: transaction.reason || null
		}
	}

  async createTransaction(params, id) {
    let { account, time, amount } = params;
    amount = Math.floor(amount);
  
    // Step 1: Check if transaction can be performed (like product exists, amount correct, etc.)
    await this.checkPerformTransaction(params, id);
  
    const transactionRef = db.collection("transactions").doc(params.id);
    const transactionSnap = await transactionRef.get();
  
    // Step 2: Check if this transaction (by ID) already exists
    if (transactionSnap.exists) {
      const transaction = transactionSnap.data();
  
      // Step 2.1: If it's paid — reject
      if (transaction.state === TransactionState.Paid) {
        throw new TransactionError(PaymeError.AlreadyDone, id); // -31099
      }
  
      // Step 2.2: If it's still pending, check if it's expired
      if (transaction.state === TransactionState.Pending) {
        const currentTime = Date.now();
        const isNotExpired = (currentTime - transaction.create_time) < 12 * 60 * 1000; // 12 minutes
  
        if (!isNotExpired) {
          // Expired — cancel it
          await transactionRef.set({
            state: TransactionState.PendingCanceled,
            reason: 4,
          }, { merge: true });
  
          throw new TransactionError(PaymeError.CantDoOperation, id); // -31008
        }
  
        // Still pending and valid — return existing transaction info
        return {
          create_time: transaction.create_time,
          transaction: transaction.id,
          state: TransactionState.Pending,
        };
      }
  
      // Unknown state
      throw new TransactionError(PaymeError.CantDoOperation, id); // -31008
    }
  
    // Step 3: This is a new transaction ID
    // Before creating, check if there's an existing PENDING transaction for the same account
    const existingQuery = await db.collection("transactions")
      .where("user", "==", account.user_id)
      .where("product", "==", account.product_id)
      .where("state", "==", TransactionState.Pending)
      .limit(1)
      .get();
  
    if (!existingQuery.empty) {
      // Existing pending transaction found for this account — reject!
      throw new TransactionError(PaymeError.Pending, id); // -31099
    }
  
    // Step 4: No conflict — create a new transaction
    await transactionRef.set({
      id: params.id,
      state: TransactionState.Pending,
      amount,
      user: account.user_id,
      product: account.product_id,
      create_time: time,
      provider: "payme",
    }, { merge: true });
  
    return {
      transaction: params.id,
      state: TransactionState.Pending,
      create_time: time
    };
  }  

  async performTransaction(params, id) {
    const currentTime = Date.now()
    const txRef = db.collection("transactions").doc(params.id)
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
    const txRef = db.collection("transactions").doc(params.id)
    const txSnap = await txRef.get()

    if (!txSnap.exists) {
      throw new TransactionError(PaymeError.TransactionNotFound, id)
    }

    const tx = txSnap.data()
    const currentTime = Date.now()

    if (tx.state > 0) {
      await txRef.update({
        state: -Math.abs(tx.state || 0),
        reason: params.reason || 0,
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
