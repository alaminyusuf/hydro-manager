const Notification = require('../models/Notification')
const socketService = require('../utils/socket')

/**
 * Create a notification for a user.
 * In the future, this will also emit a WebSocket event.
 */
const createNotification = async ({ recipient, organization, type, title, message, relatedBatch }) => {
	try {
		const notification = await Notification.create({
			recipient,
			organization,
			type,
			title,
			message,
			relatedBatch: relatedBatch || undefined,
		})

		// Emit socket event to recipient
		try {
			const io = socketService.getIO()
			if (io) {
				io.to(`user:${recipient}`).emit('notification', notification)
			}
		} catch (error) {
			console.warn('Socket.io NOT initialized, skipping emission')
		}

		return notification
	} catch (error) {
		console.error('Error creating notification:', error)
	}
}

/**
 * Create notifications for multiple recipients at once.
 */
const createBulkNotifications = async (notifications) => {
	try {
		const docs = await Notification.insertMany(notifications)

		// Emit socket events to each recipient
		try {
			const io = socketService.getIO()
			if (io) {
				docs.forEach((doc) => {
					io.to(`user:${doc.recipient}`).emit('notification', doc)
				})
			}
		} catch (error) {
			console.warn('Socket.io NOT initialized, skipping bulk emission')
		}

		return docs
	} catch (error) {
		console.error('Error creating bulk notifications:', error)
	}
}

module.exports = { createNotification, createBulkNotifications }
