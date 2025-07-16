const transactionCollection = require('../models/transaction.model');
const userCollection = require('../models/user.model');
const productCollection = require('../models/product.model');
const clickCheckToken = require('../utils/click-check');
const { ClickError, ClickAction, TransactionState } = require('../enum/transaction.enum');
const { FieldValue } = require('firebase-admin/firestore');

class ClickService {
  async prepare(data) {
    const { click_trans_id, service_id, merchant_trans_id, amount, action, sign_time, sign_string } = data;
    // Get order by merchant_trans_id (doc id)
    const orderSnap = await transactionCollection.doc(merchant_trans_id).get();
    if (!orderSnap.exists) {
      return { error: ClickError.TransactionNotFound, error_note: 'Transaction not found' };
    }
    const order = orderSnap.data();
    const userId = order.user;
    const productId = order.product;
    const orderId = merchant_trans_id;
    const signatureData = { click_trans_id, service_id, orderId, amount, action, sign_time };
    const checkSignature = clickCheckToken(signatureData, sign_string);
    if (!checkSignature) {
      return { error: ClickError.SignFailed, error_note: 'Invalid sign' };
    }
    if (parseInt(action) !== ClickAction.Prepare) {
      return { error: ClickError.ActionNotFound, error_note: 'Action not found' };
    }
    // Check if already paid
    const paidQuery = await transactionCollection
      .where('user', '==', userId)
      .where('product', '==', productId)
      .where('state', '==', TransactionState.Paid)
      .where('provider', '==', 'click')
      .limit(1)
      .get();
    if (!paidQuery.empty) {
      return { error: ClickError.AlreadyPaid, error_note: 'Already paid' };
    }
    // Check user
    const userSnap = await userCollection.doc(userId).get();
    if (!userSnap.exists) {
      return { error: ClickError.UserNotFound, error_note: 'User not found' };
    }
    // Check product
    const productSnap = await productCollection.doc(productId).get();
    if (!productSnap.exists) {
      return { error: ClickError.BadRequest, error_note: 'Product not found' };
    }
    const product = productSnap.data();
    if (parseInt(amount) !== product.price) {
      return { error: ClickError.InvalidAmount, error_note: 'Incorrect parameter amount' };
    }
    // Check if transaction canceled
    const txQuery = await transactionCollection.where('id', '==', click_trans_id).limit(1).get();
    if (!txQuery.empty && txQuery.docs[0].data().state === TransactionState.Canceled) {
      return { error: ClickError.TransactionCanceled, error_note: 'Transaction canceled' };
    }
    const time = Date.now();
    await transactionCollection.add({
      id: click_trans_id,
      user: userId,
      product: productId,
      state: TransactionState.Pending,
      create_time: time,
      amount,
      prepare_id: time,
      provider: 'click',
    });
    return {
      click_trans_id,
      merchant_trans_id,
      merchant_prepare_id: time,
      error: ClickError.Success,
      error_note: 'Success',
    };
  }

  async complete(data) {
    const { click_trans_id, service_id, merchant_trans_id, merchant_prepare_id, amount, action, sign_time, sign_string, error } = data;
    // Get order by merchant_trans_id (doc id)
    const orderSnap = await transactionCollection.doc(merchant_trans_id).get();
    if (!orderSnap.exists) {
      return { error: ClickError.TransactionNotFound, error_note: 'Transaction not found' };
    }
    const order = orderSnap.data();
    const userId = order.user;
    const productId = order.product;
    const orderId = merchant_trans_id;
    const signatureData = { click_trans_id, service_id, orderId, merchant_prepare_id, amount, action, sign_time };
    const checkSignature = clickCheckToken(signatureData, sign_string);
    if (!checkSignature) {
      return { error: ClickError.SignFailed, error_note: 'Invalid sign' };
    }
    if (parseInt(action) !== ClickAction.Complete) {
      return { error: ClickError.ActionNotFound, error_note: 'Action not found' };
    }
    // Check user
    const userSnap = await userCollection.doc(userId).get();
    if (!userSnap.exists) {
      return { error: ClickError.UserNotFound, error_note: 'User not found' };
    }
    // Check product
    const productSnap = await productCollection.doc(productId).get();
    if (!productSnap.exists) {
      return { error: ClickError.BadRequest, error_note: 'Product not found' };
    }
    const product = productSnap.data();
    // Check prepared
    const preparedQuery = await transactionCollection
      .where('prepare_id', '==', merchant_prepare_id)
      .where('provider', '==', 'click')
      .limit(1)
      .get();
    if (preparedQuery.empty) {
      return { error: ClickError.TransactionNotFound, error_note: 'Transaction not found' };
    }
    // Check already paid
    const paidQuery = await transactionCollection
      .where('user', '==', userId)
      .where('product', '==', productId)
      .where('state', '==', TransactionState.Paid)
      .where('provider', '==', 'click')
      .limit(1)
      .get();
    if (!paidQuery.empty) {
      return { error: ClickError.AlreadyPaid, error_note: 'Already paid for course' };
    }
    if (parseInt(amount) !== product.price) {
      return { error: ClickError.InvalidAmount, error_note: 'Incorrect parameter amount' };
    }
    // Check canceled
    const txQuery = await transactionCollection.where('id', '==', click_trans_id).limit(1).get();
    if (!txQuery.empty && txQuery.docs[0].data().state === TransactionState.Canceled) {
      return { error: ClickError.TransactionCanceled, error_note: 'Transaction canceled' };
    }
    const time = Date.now();
    if (error < 0) {
      // Mark as canceled
      if (!txQuery.empty) {
        await transactionCollection.doc(txQuery.docs[0].id).update({ state: TransactionState.Canceled, cancel_time: time });
      }
      return { error: ClickError.TransactionNotFound, error_note: 'Transaction not found' };
    }
    // Mark as paid
    if (!txQuery.empty) {
      await transactionCollection.doc(txQuery.docs[0].id).update({ state: TransactionState.Paid, perform_time: time });
    }
    return {
      click_trans_id,
      merchant_trans_id,
      merchant_confirm_id: time,
      error: ClickError.Success,
      error_note: 'Success',
    };
  }
}

module.exports = new ClickService();
