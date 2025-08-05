const { db } = require("../services/firebase");

const userCollection = db.collection('users');

module.exports = userCollection;
