const { PaymeMethod } = require('../enum/transaction.enum');
const transactionService = require('../services/transaction.service')
const axios = require('axios')
const { db } = require('../services/firebase')

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
			const isCard = method.includes('card');
			console.log('Payme method:', method, 'Params:', params);
			const headers = {}
			// Для методов cards авторизация:
			// id
			if (isCard) {
				headers['X-Auth'] = process.env.PAYME_MERCHANT_ID;
			}
			// Для методов receipts авторизация:
			// id:key
			if (!isCard) {
				headers['X-Auth'] = `${process.env.PAYME_MERCHANT_ID}:${process.env.PAYME_MERCHANT_KEY}`;
			}

			const response = await axios.post(process.env.PAYME_API_URL, params, {
				headers: {
					...headers
				}
			});

			console.log('Payme response:', response.data);

			if (response.data.error) {
				return res.status(400).json({ error: response.data.error });
			}

			if (method === "cards.create") {
				return res.json({
					card: response.data.result.card
				});
			} else if (method === "cards.get_verify_code") {
				return res.json({
					status: response.data.result,
				});
			} else if (method === "cards.verify") {
				return res.json({
					token: response.data.result.card.token
				});
			} else if (method === "receipts.create") {
				return res.json({
					id: response.data.result.receipt._id
				});
			} else if (method === "receipts.pay") {
				const accounts = response.data.result.receipt.account || [];
				const userAccount = accounts.find(acc => acc.name === 'user_id');
				const productAccount = accounts.find(acc => acc.name === 'product_id');
				
				if (userAccount) {
					const receipt = response.data.result.receipt;
					console.log('🧾 [DEBUG] Receipt data:', JSON.stringify(receipt));

					await db.collection('users').doc(userAccount.value).collection('receipts').add({
						receipt_id: receipt._id,
						amount: receipt.amount,
						currency: receipt.currency,
						pay_time: receipt.pay_time,
						create_time: receipt.create_time,
						state: receipt.state,
						product_id: productAccount ? productAccount.value : null,
						card: receipt.card || null,
						detail: receipt.detail || null,
						commission: receipt.commission || 0,
						description: receipt.description || '',
					});
				}

				// Send receipts to user
				await axios.post(process.env.PAYME_API_URL, {
					"id": Math.random().toString(36).substring(2, 15),
					"method": "receipts.send",
					"params": {
						"id": receipt._id,
						"phone": receipt?.payer?.phone
					}
				}, {
					headers: {
						...headers
					}
				});

				return res.json({
					id: receipt._id
				});
			}

			return res.json(response.data)
		} catch (err) {
			console.error('Error creating card:', err)
			next(err)
		}
	}

}

module.exports = new TransactionController()
