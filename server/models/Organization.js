const mongoose = require('mongoose')

const organizationSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		owner: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		members: [
			{
				user: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'User',
				},
				role: {
					type: String,
					enum: ['owner', 'admin', 'manager', 'member'],
					default: 'member',
				},
				username: String,
				email: String,
			},
		],
		settings: {
			maxMembers: {
				type: Number,
				default: 5,
			},
			maxBatches: {
				type: Number,
				default: 10,
			},
		},
		subscription: {
			status: {
				type: String,
				enum: ['active', 'inactive', 'trialing', 'canceled'],
				default: 'inactive',
			},
			stripeCustomerId: String,
			stripeSubscriptionId: String,
			plan: {
				type: String,
				enum: ['free', 'pro', 'enterprise'],
				default: 'free',
			},
		},
		isSimulation: { type: Boolean, default: false },
	},
	{
		timestamps: true,
	}
)

module.exports = mongoose.model('Organization', organizationSchema)
