const Notification = require('../models/Notification')

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

		// TODO (Phase 2): Emit socket event to recipient
		// io.to(`user:${recipient}`).emit('notification', notification)

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
		return docs
	} catch (error) {
		console.error('Error creating bulk notifications:', error)
	}
}

module.exports = { createNotification, createBulkNotifications }
