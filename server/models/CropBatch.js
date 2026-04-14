const mongoose = require('mongoose')

const noteSchema = new mongoose.Schema({
	text: { type: String, required: true },
	author: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	createdAt: { type: Date, default: Date.now },
})

const logSchema = new mongoose.Schema({
	value: { type: Number, required: true },
	loggedAt: { type: Date, default: Date.now },
})

const cropBatchSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		organization: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Organization',
			required: true,
		},
		name: { type: String, required: true },
		cropType: {
			type: String,
			required: true,
			enum: ['Lettuce', 'Herbs', 'Tomato', 'Other'],
		},
		status: {
			type: String,
			enum: ['planning', 'seeding', 'growing', 'harvesting', 'completed', 'archived'],
			default: 'planning',
		},
		assignedTo: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
		}],
		startDate: { type: Date, required: true },
		harvestDate: { type: Date },
		pHLog: [logSchema],
		ecLog: [logSchema],
		notes: [noteSchema],
		isSimulation: { type: Boolean, default: false },
	},
	{ timestamps: true }
)

module.exports = mongoose.model('CropBatch', cropBatchSchema)
