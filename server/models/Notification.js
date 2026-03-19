const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema(
	{
		recipient: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		organization: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Organization',
			required: true,
		},
		type: {
			type: String,
			required: true,
			enum: [
				'batch_assigned',
				'batch_status_changed',
				'member_added',
				'member_removed',
				'role_changed',
				'reading_logged',
				'harvest_ready',
			],
		},
		title: {
			type: String,
			required: true,
		},
		message: {
			type: String,
			required: true,
		},
		relatedBatch: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'CropBatch',
		},
		read: {
			type: Boolean,
			default: false,
		},
	},
	{ timestamps: true }
)

// Index for fast queries on user's notifications
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 })

module.exports = mongoose.model('Notification', notificationSchema)
