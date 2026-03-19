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
					enum: ['admin', 'member'],
					default: 'member',
				},
			},
		],
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
	},
	{
		timestamps: true,
	}
)

module.exports = mongoose.model('Organization', organizationSchema)
