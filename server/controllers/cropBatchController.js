const asyncHandler = require('express-async-handler')
const mongoose = require('mongoose')
const CropBatch = require('../models/CropBatch')
const Expense = require('../models/Expense')
const { createNotification, createBulkNotifications } = require('../services/notificationService')
const { detectAnomalies, predictHarvestDate, calculateHealthScore } = require('../services/aiService')

// Valid status transitions
const VALID_TRANSITIONS = {
	planning: ['seeding'],
	seeding: ['growing', 'planning'],
	growing: ['harvesting', 'seeding'],
	harvesting: ['completed', 'growing'],
	completed: ['archived'],
	archived: [],
}

// @desc    Get all crop batches for an organization
// @route   GET /api/batches
// @access  Private
const getBatches = asyncHandler(async (req, res) => {
	const batches = await CropBatch.find({ organization: req.tenantId })
		.populate('assignedTo', 'full_Name username email')
		.sort({ startDate: -1 })
	res.json(batches)
})

// @desc    Get batches assigned to the current user
// @route   GET /api/batches/my-assignments
// @access  Private
const getMyAssignments = asyncHandler(async (req, res) => {
	const batches = await CropBatch.find({
		organization: req.tenantId,
		assignedTo: req.user._id,
	})
		.populate('assignedTo', 'full_Name username email')
		.sort({ startDate: -1 })
	res.json(batches)
})

// @desc    Start a new crop batch
// @route   POST /api/batches
// @access  Private (owner, admin, manager)
const startBatch = asyncHandler(async (req, res) => {
	const { name, cropType, startDate, harvestDate } = req.body

	if (!name || !cropType || !startDate) {
		res.status(400)
		throw new Error('Please include batch name, crop type, and start date.')
	}

	const newBatch = await CropBatch.create({
		user: req.user._id,
		organization: req.tenantId,
		name,
		cropType,
		startDate,
		harvestDate: harvestDate || null,
		assignedTo: [req.user._id], // Creator is auto-assigned
		status: 'planning',
	})

	// Notify the creator about the new batch
	createNotification({
		recipient: req.user._id,
		organization: req.tenantId,
		type: 'batch_assigned',
		title: 'New Batch Started',
		message: `A new batch "${newBatch.name}" has been successfully created.`,
		relatedBatch: newBatch._id,
	})

	res.status(201).json(newBatch)
})

// @desc    Log a new pH or EC reading to a batch
// @route   PUT /api/batches/:id/log
// @access  Private (all roles)
const logReading = asyncHandler(async (req, res) => {
	const { type, value } = req.body
	const batchId = req.params.id

	if (!type || !value || !['pH', 'EC'].includes(type)) {
		res.status(400)
		throw new Error('Invalid log type or missing value.')
	}

	const batch = await CropBatch.findOne({
		_id: batchId,
		organization: req.tenantId,
	})

	if (!batch) {
		res.status(404)
		throw new Error('Crop Batch not found.')
	}

	const logEntry = { value }
	if (type === 'pH') {
		batch.pHLog.push(logEntry)
	} else if (type === 'EC') {
		batch.ecLog.push(logEntry)
	}

	await batch.save()
	res.json(batch)
})

// @desc    Get single crop batch details
// @route   GET /api/batches/:id
// @access  Private
const getBatchDetails = asyncHandler(async (req, res) => {
	const batchId = req.params.id

	if (!mongoose.Types.ObjectId.isValid(batchId)) {
		res.status(400)
		throw new Error('Invalid Batch ID format.')
	}

	const batch = await CropBatch.findOne({
		_id: batchId,
		organization: req.tenantId,
	})
		.populate('assignedTo', 'full_Name username email')
		.populate('notes.author', 'full_Name')

	if (!batch) {
		res.status(404)
		throw new Error('Crop Batch not found or not authorized.')
	}

	res.json({ batchDetails: batch })
})

// @desc    Update/set the harvest date for a crop batch
// @route   PUT /api/batches/:id/harvest
// @access  Private (owner, admin, manager)
const updateHarvestDate = asyncHandler(async (req, res) => {
	const batchId = req.params.id
	const { harvestDate } = req.body

	if (!harvestDate) {
		res.status(400)
		throw new Error('Harvest date is required.')
	}

	const existingBatch = await CropBatch.findOne({
		_id: batchId,
		organization: req.tenantId,
	})

	if (!existingBatch) {
		res.status(404)
		throw new Error('Crop Batch not found or not authorized.')
	}

	const newHarvestDate = new Date(harvestDate)
	const startDate = new Date(existingBatch.startDate)

	if (newHarvestDate < startDate) {
		res.status(400)
		throw new Error(
			`Harvest date (${newHarvestDate.toLocaleDateString()}) cannot be before the start date (${startDate.toLocaleDateString()}).`
		)
	}

	existingBatch.harvestDate = newHarvestDate
	await existingBatch.save()

	res.status(200).json(existingBatch)
})

// @desc    Update batch lifecycle status
// @route   PUT /api/batches/:id/status
// @access  Private (owner, admin, manager)
const updateBatchStatus = asyncHandler(async (req, res) => {
	const batchId = req.params.id
	const { status } = req.body

	if (!status) {
		res.status(400)
		throw new Error('Status is required.')
	}

	const batch = await CropBatch.findOne({
		_id: batchId,
		organization: req.tenantId,
	})

	if (!batch) {
		res.status(404)
		throw new Error('Crop Batch not found.')
	}

	// Validate transition
	const allowed = VALID_TRANSITIONS[batch.status]
	if (!allowed || !allowed.includes(status)) {
		res.status(400)
		throw new Error(
			`Cannot transition from '${batch.status}' to '${status}'. Allowed transitions: ${(allowed || []).join(', ') || 'none'}`
		)
	}

	batch.status = status

	// Auto-set harvest date when completing
	if (status === 'completed' && !batch.harvestDate) {
		batch.harvestDate = new Date()
	}

	await batch.save()
	res.status(200).json(batch)

	// Notify assigned members about status change (fire-and-forget)
	// We notify everyone assigned, including the person who made the change if it's a critical update like 'seeding'
	if (batch.assignedTo && batch.assignedTo.length > 0) {
		const notifications = batch.assignedTo
			.filter((id) => {
				// For 'seeding' transition, we might want to ensure a notification record exists for the operator
				// but generally we filter out the current user to avoid self-spam.
				// However, if the user specifically asked for it, we can adjust.
				// For now, let's notify others, and if it's the requested specific case, ensure it's handled.
				return id.toString() !== req.user._id.toString() || status === 'seeding'
			})
			.map((userId) => ({
				recipient: userId,
				organization: req.tenantId,
				type: 'batch_status_changed',
				title: `Batch status updated`,
				message: `"${batch.name}" status changed to ${status}.`,
				relatedBatch: batch._id,
			}))
		if (notifications.length > 0) createBulkNotifications(notifications)
	}
})

// @desc    Assign members to a batch
// @route   PUT /api/batches/:id/assign
// @access  Private (owner, admin)
const assignBatch = asyncHandler(async (req, res) => {
	const batchId = req.params.id
	const { userIds } = req.body
	console.log("User Ids "+userIds)

	if (!userIds || !Array.isArray(userIds)) {
		res.status(400)
		throw new Error('Please provide an array of user IDs to assign.')
	}

	const batch = await CropBatch.findOne({
		_id: batchId,
		organization: req.tenantId,
	})

	if (!batch) {
		res.status(404)
		throw new Error('Crop Batch not found.')
	}

	const previousAssignments = (batch.assignedTo || []).filter(id => id).map(id => id.toString());
	const newAssignments = userIds.filter(id => !previousAssignments.includes(id));

	// Verify all users are members of the organization
	const orgMemberIds = (req.organization.members || []).map((m) => (m.user?._id || m.user).toString())
	const invalidUsers = userIds.filter((id) => !orgMemberIds.includes(id))

	if (invalidUsers.length > 0) {
		res.status(400)
		throw new Error(
			`The following users are not members of this organization: ${invalidUsers.join(', ')}`
		)
	}

	batch.assignedTo = userIds
	await batch.save()

	await batch.populate('assignedTo', 'full_Name username email')
	res.status(200).json(batch)

	if (newAssignments.length > 0) {
		const notifications = newAssignments
			.filter((id) => id !== req.user._id.toString())
			.map((userId) => ({
				recipient: userId,
				organization: req.tenantId,
				type: 'batch_assigned',
				title: 'New batch assignment',
				message: `You have been assigned to batch "${batch.name}".`,
				relatedBatch: batch._id,
			}))
		if (notifications.length > 0) createBulkNotifications(notifications)
	}
})

// @desc    Get AI insights for a batch
// @route   GET /api/batches/:id/insights
// @access  Private
const getBatchInsights = asyncHandler(async (req, res) => {
	const batchId = req.params.id

	const batch = await CropBatch.findOne({
		_id: batchId,
		organization: req.tenantId,
	})

	if (!batch) {
		res.status(404)
		throw new Error('Crop Batch not found.')
	}

	const phAnomalies = detectAnomalies(batch.pHLog)
	const ecAnomalies = detectAnomalies(batch.ecLog)
	const predictedHarvest = predictHarvestDate(batch)
	const healthScore = calculateHealthScore(phAnomalies, ecAnomalies)

	res.json({
		batchId: batch._id,
		name: batch.name,
		insights: {
			phAnomalies,
			ecAnomalies,
			predictedHarvest,
			healthScore,
			status: batch.status,
		},
	})
})

module.exports = {
	getBatches,
	startBatch,
	logReading,
	getBatchDetails,
	updateHarvestDate,
	updateBatchStatus,
	assignBatch,
	getMyAssignments,
	getBatchInsights,
}
