const express = require('express')
const router = express.Router()
const {
	getBatches,
	startBatch,
	logReading,
	getBatchDetails,
	updateHarvestDate,
} = require('../controllers/cropBatchController')
const { protect } = require('../middleware/authMiddleware')
const { tenantHandler } = require('../middleware/tenantMiddleware')

router.use(protect)
router.use(tenantHandler)

router
	.route('/')
	.get(getBatches) // GET /api/batches (Get all crop batches)
	.post(startBatch) // POST /api/batches (Start a new crop batch)
router.get('/:id', getBatchDetails)
router.put('/:id/harvest', updateHarvestDate)
// Log Reading Route
router.put('/:id/log', logReading) // PUT /api/batches/:id/log (Add pH or EC reading)

module.exports = router
