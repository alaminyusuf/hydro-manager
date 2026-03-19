const express = require('express')
const router = express.Router()
const {
	getTransactions,
	addTransaction,
	getSummary,
} = require('../controllers/expenseController')
const { protect } = require('../middleware/authMiddleware')
const { tenantHandler } = require('../middleware/tenantMiddleware')
const { authorize } = require('../middleware/rbacMiddleware')

// Protected Routes
router.use(protect)
router.use(tenantHandler)

// All members can view transactions and summary
router.get('/', getTransactions)
router.get('/summary', getSummary)

// Only owner, admin, manager can add transactions
router.post('/', authorize('owner', 'admin', 'manager'), addTransaction)

module.exports = router
