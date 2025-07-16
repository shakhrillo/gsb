const { PaymeMethod } = require('../enum/transaction.enum')
const transactionService = require('../services/transaction.service')
const axios = require('axios')

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
			console.log('Creating card with params:', params)
			const response = await axios.post(process.env.PAYME_API_URL, params, {
				headers: {
					'X-Auth': `${process.env.PAYME_MERCHANT_ID}:${process.env.PAYME_MERCHANT_KEY}`,
					'Cache-Control': 'no-cache'
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
