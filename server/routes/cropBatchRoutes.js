const express = require('express')
const router = express.Router()
const {
	getBatches,
	startBatch,
	logReading,
	getBatchDetails,
	updateHarvestDate,
	updateBatchStatus,
	assignBatch,
	getMyAssignments,
	getBatchInsights,
} = require('../controllers/cropBatchController')
const { protect } = require('../middleware/authMiddleware')
const { tenantHandler } = require('../middleware/tenantMiddleware')
const { authorize } = require('../middleware/rbacMiddleware')

router.use(protect)
router.use(tenantHandler)

/**
 * @swagger
 * /api/batches:
 *   get:
 *     summary: Get all crop batches
 *     tags: [Batches]
 *     responses:
 *       200:
 *         description: List of batches
 */
router.get('/', getBatches)

/**
 * @swagger
 * /api/batches/my-assignments:
 *   get:
 *     summary: Get batches assigned to me
 *     tags: [Batches]
 *     responses:
 *       200:
 *         description: List of assigned batches
 */
router.get('/my-assignments', getMyAssignments)

/**
 * @swagger
 * /api/batches/{id}:
 *   get:
 *     summary: Get batch details
 *     tags: [Batches]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Batch details
 */
router.get('/:id', getBatchDetails)

/**
 * @swagger
 * /api/batches/{id}/insights:
 *   get:
 *     summary: Get AI insights for a batch
 *     tags: [Batches]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: AI insights including anomalies and predictions
 */
router.get('/:id/insights', getBatchInsights)

// Owner, admin, manager can create batches and log readings
router.post('/', authorize('owner', 'admin', 'manager'), startBatch)
router.put('/:id/log', authorize('owner', 'admin', 'manager', 'member'), logReading)
router.put('/:id/harvest', authorize('owner', 'admin', 'manager'), updateHarvestDate)

// Batch lifecycle & assignment
router.put('/:id/status', authorize('owner', 'admin', 'manager'), updateBatchStatus)
router.put('/:id/assign', authorize('owner', 'admin'), assignBatch)

module.exports = router
