const asyncHandler = require('express-async-handler')
const Notification = require('../models/Notification')

// @desc    Get current user's notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
	const { unreadOnly } = req.query

	const filter = { recipient: req.user._id }
	if (unreadOnly === 'true') {
		filter.read = false
	}

	const notifications = await Notification.find(filter)
		.populate('relatedBatch', 'name')
		.sort({ createdAt: -1 })
		.limit(50)

	const unreadCount = await Notification.countDocuments({
		recipient: req.user._id,
		read: false,
	})

	res.json({ notifications, unreadCount })
})

// @desc    Mark a single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
	const notification = await Notification.findOneAndUpdate(
		{ _id: req.params.id, recipient: req.user._id },
		{ read: true },
		{ new: true }
	)

	if (!notification) {
		res.status(404)
		throw new Error('Notification not found')
	}

	res.json(notification)
})

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = asyncHandler(async (req, res) => {
	await Notification.updateMany(
		{ recipient: req.user._id, read: false },
		{ read: true }
	)

	res.json({ message: 'All notifications marked as read' })
})

module.exports = { getNotifications, markAsRead, markAllAsRead }
