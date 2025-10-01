const mongoose = require('mongoose')

// Get MongoDB connection URI from environment variables
const MONGO_URI =
	process.env.MONGO_URI || 'mongodb://localhost:27017/hdro-manager'

/**
 * Connects to the MongoDB database.
 */
const connectDB = async () => {
	try {
		mongoose.connect(MONGO_URI)
		const connection = mongoose.connection

		connection.on('connected', () => {
			console.log('Great! MongoDb is connected bro!')
		})

		connection.on('error', (err) => {
			console.log('MongoDB connected ERROR. ' + err)
			process.exit()
		})
	} catch (error) {
		console.log('Ups! Something went wrong! ' + error)
	}
}

module.exports = connectDB
