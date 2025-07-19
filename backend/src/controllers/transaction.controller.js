const { PaymeMethod } = require('../enum/transaction.enum');
const { db, admin } = require('../services/firebase');
const transactionService = require('../services/transaction.service')
const axios = require('axios')
const CryptoJS = require('crypto-js');

class TransactionController {
	async payme(req, res, next) {
		try {
			const { method, params, id } = req.body;

			switch (method) {
				case PaymeMethod.CheckPerformTransaction: {
					const detail = await transactionService.checkPerformTransaction(params, id)
					return res.json({ result: { allow: true, detail } })
				}
				case PaymeMethod.CheckTransaction: {
					const result = await transactionService.checkTransaction(params, id)
					return res.json({ result, id })
				}
				case PaymeMethod.CreateTransaction: {
					const result = await transactionService.createTransaction(params, id)
					return res.json({ result, id })
				}
				case PaymeMethod.PerformTransaction: {
					const result = await transactionService.performTransaction(params, id)
					return res.json({ result, id })
				}
				case PaymeMethod.CancelTransaction: {
					const result = await transactionService.cancelTransaction(params, id)
					return res.json({ result, id })
				}
				case PaymeMethod.GetStatement: {
					const result = await transactionService.getStatement(params, id)
					return res.json({ result: { transactions: result } })
				}
			}
		} catch (err) {
			next(err)
		}
	}

	async checkout(req, res, next) {
		try {
			const user = req.user;
			const { product_id, amount } = req.body
			const result = await transactionService.checkout({
				user_id: user.uid, product_id, amount
			})
			return res.json({ result })
		} catch (err) {
			next(err)
		}
	}

	async card(req, res, next) {
		try {
			const params = req.body;
			const method = params.method;
			const { card } = params;
			const isCard = method.includes('card');
			const isCardVerify = method === 'cards.verify';

			// Save card with
			if (isCardVerify) {
				// const encryptedCard = {
				// 	number: CryptoJS.AES.encrypt(cardNumber, process.env.CRYPTO_SECRET).toString(),
				// 	exp_month: CryptoJS.AES.encrypt(cardExpMonth, process.env.CRYPTO_SECRET).toString(),
				// 	exp_year: CryptoJS.AES.encrypt(cardExpYear, process.env.CRYPTO_SECRET).toString()
				// }

				// Add to user cards
				// await db.collection('users').doc(user.uid).update({
				// 	cards: admin.firestore.FieldValue.arrayUnion(card)
				// });
			}

			// console.log('Creating card with params:', params)
			const response = await axios.post(process.env.PAYME_API_URL, params, {
				headers: {
					'X-Auth': `${process.env.PAYME_MERCHANT_ID}:${!isCard ? process.env.PAYME_MERCHANT_KEY : process.env.PAYME_MERCHANT_TEST_KEY}`,
					// 'Cache-Control': 'no-cache'
				}
			});
			return res.json(response.data)
		} catch (err) {
			console.error('Error creating card:', err)
			next(err)
		}
	}

}

module.exports = new TransactionController()
