const asyncHandler = require('express-async-handler')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const User = require('../models/User')

// Helper function to generate JWT (remains the same)
const generateToken = (id) => {
	return jwt.sign({ id }, 'process.env.JWT_SECRET', {
		expiresIn: '30d',
	})
}

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
	// Destructure the new field names
	const { full_Name, email, username, password, photo } = req.body

	// Basic validation
	if (!full_Name || !email || !username || !password) {
		res
			.status(400)
			.send(
				'Please enter all required fields: Full Name, Email, Username, and Password.'
			)
	}

	// Check if user exists by Email or Username
	const userExists = await User.findOne({ $or: [{ email }, { username }] })

	if (userExists) {
		return res
			.status(400)
			.send('User with that Email or Username already exists.')
	}

	const salt = await bcrypt.genSalt(10)
	const hashedPassword = await bcrypt.hash(password, salt)
	const user = await User.create({
		full_Name,
		email,
		username,
		password: hashedPassword,
		photo: photo || undefined,
	})

	if (user) {
		res.status(201).json({
			_id: user._id,
			full_Name: user.full_Name,
			email: user.email,
			username: user.username,
			photo: user.photo,
			token: generateToken(user._id),
		})
	} else {
		res.status(400).send('Invalid user data')
	}
})

// @desc    Authenticate user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
	const { email, password } = req.body
	// Find user by Email
	const user = await User.findOne({ email })
	const verified = await bcrypt.compare(password, user.password)

	if (user && verified) {
		res.json({
			_id: user._id,
			full_Name: user.full_Name,
			email: user.email,
			username: user.username,
			photo: user.photo,
			token: generateToken(user._id),
		})
	} else {
		return res.status(400).send('Invalid email or password')
	}
})

module.exports = { registerUser, authUser }
