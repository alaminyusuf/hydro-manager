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

/**
 * @swagger
 * /api/expenses:
 *   get:
 *     summary: Get all expense transactions
 *     tags: [Expenses]
 *     responses:
 *       200:
 *         description: List of transactions
 */
router.get('/', getTransactions)

/**
 * @swagger
 * /api/expenses/summary:
 *   get:
 *     summary: Get financial summary
 *     tags: [Expenses]
 *     responses:
 *       200:
 *         description: Financial summary by category and totals
 */
router.get('/summary', getSummary)

/**
 * @swagger
 * /api/expenses:
 *   post:
 *     summary: Add a new expense transaction
 *     tags: [Expenses]
 *     responses:
 *       201:
 *         description: Transaction added successfully
 */
router.post('/', authorize('owner', 'admin', 'manager'), addTransaction)

module.exports = router
