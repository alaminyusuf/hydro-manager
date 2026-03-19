const asyncHandler = require('express-async-handler')
const mongoose = require('mongoose')
const CropBatch = require('../models/CropBatch')
const Expense = require('../models/Expense')

// @desc    Get all crop batches for a user
// @route   GET /api/batches
// @access  Private
const getBatches = asyncHandler(async (req, res) => {
	const batches = await CropBatch.find({ organization: req.tenantId }).sort({
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
		organization: req.tenantId,
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

	const batch = await CropBatch.findOne({
		_id: batchId,
		organization: req.tenantId,
	})

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

// @desc    Get single crop batch details (including its financial summary)
// @route   GET /api/batches/:id
// @access  Private
const getBatchDetails = asyncHandler(async (req, res) => {
	const batchId = req.params.id
	const userId = req.user.id

	if (!mongoose.Types.ObjectId.isValid(batchId)) {
		res.status(400).send('Invalid Batch ID format.')
	}

	const batchObjectId = new mongoose.Types.ObjectId(batchId)
	const userObjectId = new mongoose.Types.ObjectId(userId)

	// 1. Fetch the core batch document
	const batch = await CropBatch.findOne({
		_id: batchObjectId,
		organization: req.tenantId,
	})

	if (!batch) {
		res.status(404).send('Crop Batch not found or user not authorized.')
	}

	// 2. Combine and send the response
	res.json({
		batchDetails: batch,
	})
})

// @desc    Update/set the harvest date for a crop batch (mark as complete)
// @route   PUT /api/batches/:id/harvest
// @access  Private
const updateHarvestDate = asyncHandler(async (req, res) => {
	const batchId = req.params.id
	const { harvestDate } = req.body

	if (!harvestDate) {
		res.status(400).send('Harvest date is required.')
	}

	// 1. Find the existing batch to check its start date
	const existingBatch = await CropBatch.findOne({
		_id: batchId,
		user: userId,
	})

	if (!existingBatch) {
		res.status(404).send('Crop Batch not found or user not authorized.')
	}

	// Convert dates to comparable Date objects
	const newHarvestDate = new Date(harvestDate)
	const startDate = new Date(existingBatch.startDate)

	// 2. 🚨 CRITICAL CHECK: Prevent harvest date before start date 🚨
	if (newHarvestDate < startDate) {
		res
			.status(400)
			.send(
				`Harvest date (${newHarvestDate.toLocaleDateString()}) cannot be before the start date (${startDate.toLocaleDateString()}).`
			)
	}

	const batch = await CropBatch.findOneAndUpdate(
		{ _id: batchId, organization: req.tenantId }, // Find by ID and ensure organization context
		{ $set: { harvestDate: new Date(harvestDate) } },
		{ new: true, runValidators: true } // Return the updated document
	)

	if (!batch) {
		res.status(404).send('Crop Batch not found or user not authorized.')
	}

	res.status(200).json(batch)
})

module.exports = {
	getBatches,
	startBatch,
	logReading,
	getBatchDetails,
	updateHarvestDate,
}
