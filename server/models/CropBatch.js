const mongoose = require('mongoose')

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
		name: { type: String, required: true },
		cropType: {
			type: String,
			required: true,
			enum: ['Lettuce', 'Herbs', 'Tomato', 'Other'],
		},
		startDate: { type: Date, required: true },
		harvestDate: { type: Date }, // Optional: Can be set on completion
		pHLog: [logSchema], // Sub-document for manual pH readings
		ecLog: [logSchema], // Sub-document for manual EC readings
	},
	{ timestamps: true }
)

module.exports = mongoose.model('CropBatch', cropBatchSchema)
