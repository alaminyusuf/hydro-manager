const express = require('express')
const router = express.Router()
const {
	getBatches,
	startBatch,
	logReading,
} = require('../controllers/cropBatchController')
const { protect } = require('../middleware/authMiddleware') // Import authentication middleware

// Protected Routes
router
	.route('/')
	.get(protect, getBatches) // GET /api/batches (Get all crop batches)
	.post(protect, startBatch) // POST /api/batches (Start a new crop batch)

// Log Reading Route
router.put('/:id/log', protect, logReading) // PUT /api/batches/:id/log (Add pH or EC reading)

module.exports = router
