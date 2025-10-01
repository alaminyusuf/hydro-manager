const asyncHandler = require('express-async-handler')
const CropBatch = require('../models/CropBatch')

// @desc    Get all crop batches for a user
// @route   GET /api/batches
// @access  Private
const getBatches = asyncHandler(async (req, res) => {
	const batches = await CropBatch.find({ user: req.user.id }).sort({
		startDate: -1,
	})
	res.json(batches)
})

// @desc    Start a new crop batch
// @route   POST /api/batches
// @access  Private
const startBatch = asyncHandler(async (req, res) => {
	const { name, cropType, startDate, harvestDate } = req.body

	if (!name || !cropType || !startDate) {
		res
			.status(400)
			.send('Please include batch name, crop type, and start date.')
	}

	const newBatch = await CropBatch.create({
		user: req.user.id,
		name,
		cropType,
		startDate,
		harvestDate: harvestDate || null,
	})

	res.status(201).json(newBatch)
})

// @desc    Log a new pH or EC reading to a batch
// @route   PUT /api/batches/:id/log
// @access  Private
const logReading = asyncHandler(async (req, res) => {
	const { type, value } = req.body
	const batchId = req.params.id

	if (!type || !value || !['pH', 'EC'].includes(type)) {
		res.status(400).send('Invalid log type or missing value.')
	}

	const batch = await CropBatch.findById(batchId)

	if (!batch || batch.user.toString() !== req.user.id) {
		res.status(404).send('Crop Batch not found or user not authorized.')
	}

	// Add the new log entry (as a sub-document)
	const logEntry = { value }

	if (type === 'pH') {
		batch.pHLog.push(logEntry)
	} else if (type === 'EC') {
		batch.ecLog.push(logEntry)
	}

	await batch.save()

	res.json(batch)
})

module.exports = { getBatches, startBatch, logReading }
