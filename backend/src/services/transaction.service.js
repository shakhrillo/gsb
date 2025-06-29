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

    const transactionRef = db.collection("transactions").doc(params.id);
    const transactionSnap = await transactionRef.get();

    if (transactionSnap.exists) {
      // check status of existing transaction
      const transaction = transactionSnap.data();

      if (transaction.state === TransactionState.Pending) {
        throw new TransactionError(PaymeError.CantDoOperation, id); // -31008
      }

      // check created date 
      // Отмена транзакции по таймауту производится через 12 часов — 43 200 000 миллисекунд с момента создания транзакции в Payme Business. После отмены по таймауту транзакция переходит в состояние: “Транзакция отменена” (-1), с причиной: “Отмена по таймауту” (4).
      const now = Date.now();
      const isNotExpired = (now - transaction.create_time) < 12 * 60 * 60 * 1000; // 12 hours
      if (!isNotExpired) {
        // Expired
        await transactionRef.set({
          state: TransactionState.PendingCanceled,
          reason: 4
        }, { merge: true });

        throw new TransactionError(PaymeError.CantDoOperation, id); // -31008
      }

      return {
        transaction: params.id,
        create_time: transaction.create_time,
        state: TransactionState.Pending
      };
    } else {
      await this.checkPerformTransaction(params, id);

      // Save state = 1
      // transactionRef.set({
      //   state: TransactionState.Pending,
      // }, { merge: true });

      // Одноразовый счет. Например заказ в интернет магазине
      // Бронирование заказа
      // Блокировка заказа от
      // изменений (Статус заказа "в
      // ожидании оплаты")

      const newTransaction = await transactionRef.set({
        id: params.id,
        state: TransactionState.Pending,
        amount,
        user: account.user_id,
        product: account.product_id,
        create_time: time,
        provider: 'payme',
      }, { merge: true });
  
      return {
        transaction: params.id,
        state: TransactionState.Pending,
        create_time: time
      }

      
      // Только для адаптивных
      // платежей
      // Формирование списка
      // получателей
      
    }
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
