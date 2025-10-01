const jwt = require('jsonwebtoken')
const asyncHandler = require('express-async-handler')
const User = require('../models/User')

// Middleware to protect private routes
const protect = asyncHandler(async (req, res, next) => {
	let token

	// Check for the 'Bearer' token in the header
	// Header format: Authorization: Bearer <token>
	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith('Bearer')
	) {
		try {
			// 1. Get token from header (split "Bearer <token>" to get just the token)
			token = req.headers.authorization.split(' ')[1]

			// 2. Verify token
			// Uses the secret key defined in your environment variables
			const decoded = jwt.verify(token, 'process.env.JWT_SECRET')

			// 3. Get user from the token payload (excluding the password)
			// The decoded object contains the user ID that was used to sign the token
			req.user = await User.findById(decoded.id).select('-password')

			if (!req.user) {
				res.status(401) // Unauthorized
				throw new Error('Not authorized, user not found')
			}

			// Proceed to the next middleware or controller function
			next()
		} catch (error) {
			console.error(error)
			res.status(401) // Unauthorized
			throw new Error('Not authorized, token failed')
		}
	}

	if (!token) {
		res.status(401) // Unauthorized
		throw new Error('Not authorized, no token')
	}
})

module.exports = { protect }
