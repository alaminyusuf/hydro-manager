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
} = require('../controllers/cropBatchController')
const { protect } = require('../middleware/authMiddleware')
const { tenantHandler } = require('../middleware/tenantMiddleware')
const { authorize } = require('../middleware/rbacMiddleware')

router.use(protect)
router.use(tenantHandler)

// All members can view batches
router.get('/', getBatches)
router.get('/my-assignments', getMyAssignments)
router.get('/:id', getBatchDetails)

// Owner, admin, manager can create batches and log readings
router.post('/', authorize('owner', 'admin', 'manager'), startBatch)
router.put('/:id/log', authorize('owner', 'admin', 'manager', 'member'), logReading)
router.put('/:id/harvest', authorize('owner', 'admin', 'manager'), updateHarvestDate)

// Batch lifecycle & assignment
router.put('/:id/status', authorize('owner', 'admin', 'manager'), updateBatchStatus)
router.put('/:id/assign', authorize('owner', 'admin'), assignBatch)

module.exports = router
