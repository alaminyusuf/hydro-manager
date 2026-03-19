const express = require('express')
const router = express.Router()
const {
	getTransactions,
	addTransaction,
	getSummary,
} = require('../controllers/expenseController')
const { protect } = require('../middleware/authMiddleware') // Import authentication middleware
const { tenantHandler } = require('../middleware/tenantMiddleware')

// Protected Routes
router.use(protect)
router.use(tenantHandler)

router
	.route('/')
	.get(getTransactions) // GET /api/expenses (Get all transactions)
	.post(addTransaction) // POST /api/expenses (Add a new transaction)

// Analytics Route
router.get('/summary', getSummary) // GET /api/expenses/summary (Dashboard totals)

module.exports = router
