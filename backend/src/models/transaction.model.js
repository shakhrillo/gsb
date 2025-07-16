const { db } = require("../services/firebase");

const transactionCollection = db.collection('transactions');

module.exports = transactionCollection;
