const { db } = require("../services/firebase");

const productCollection = db.collection('products');

module.exports = productCollection;
