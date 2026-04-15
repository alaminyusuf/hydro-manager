const mongoose = require('mongoose')
const userSchema = new mongoose.Schema(
	{
		full_Name: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			unique: true, // Ensures no two users share the same email
			trim: true,
			lowercase: true,
		},
		username: {
			type: String,
			required: true,
			unique: true, // Ensures no two users share the same username
			trim: true,
		},
		password: {
			type: String,
			required: true,
		},
		photo: {
			type: String,
			// Optional: Could store a URL to an image hosting service (e.g., Cloudinary, S3)
			default: 'https://i.imgur.com/placeholder-user.png',
		},
		organizations: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Organization',
			},
		],
		isSimulation: { type: Boolean, default: false },
		isPremium: { type: Boolean, default: false },
	},
	{
		timestamps: true,
	}
)

module.exports = mongoose.model('User', userSchema)
