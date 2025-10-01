const express = require('express')
const router = express.Router()
const {
	getTransactions,
	addTransaction,
	getSummary,
} = require('../controllers/expenseController')
const { protect } = require('../middleware/authMiddleware') // Import authentication middleware

// Protected Routes
router
	.route('/')
	.get(protect, getTransactions) // GET /api/expenses (Get all transactions)
	.post(protect, addTransaction) // POST /api/expenses (Add a new transaction)

// Analytics Route
router.get('/summary', protect, getSummary) // GET /api/expenses/summary (Dashboard totals)

module.exports = router
