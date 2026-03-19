const mongoose = require('mongoose')

const expenseSchema = new mongoose.Schema(
	{
		user: {
			// Establishes ownership: links the expense to the User who created it
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		organization: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Organization',
			required: true,
		},
		amount: {
			type: Number,
			required: true,
			min: 0.01, // Ensures a positive value
		},
		isIncome: {
			// True for Income (e.g., Sales), False for Expense (e.g., Electricity)
			type: Boolean,
			required: true,
		},
		category: {
			type: String,
			required: true,
			// Define common hydroponic categories for easier filtering
			enum: [
				'Electricity',
				'Nutrients',
				'Water',
				'Seeds/Seedlings',
				'Labor',
				'Maintenance',
				'Sales',
				'Other Income',
				'Other Expense',
			],
		},
		description: {
			type: String,
			trim: true,
			default: '',
		},
		date: {
			type: Date,
			default: Date.now,
		},
		batch: {
			// Links the transaction to a specific Crop Batch for profit analysis
			type: mongoose.Schema.Types.ObjectId,
			ref: 'CropBatch',
			// 'required: false' means an expense can be general (e.g., rent) or batch-specific
			required: false,
		},
	},
	{
		timestamps: true,
	}
)

module.exports = mongoose.model('Expense', expenseSchema)
