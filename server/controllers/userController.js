const asyncHandler = require('express-async-handler')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const Organization = require('../models/Organization')

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
		// Create default organization
		const defaultOrg = await Organization.create({
			name: `${full_Name}'s Farm`,
			owner: user._id,
			members: [{ user: user._id, role: 'owner' }],
			subscription: {
				status: 'inactive',
				plan: 'free'
			}
		})

		// Add organization to user
		user.organizations.push(defaultOrg._id)
		await user.save()

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
const login = asyncHandler(async (req, res) => {
	const { email, password } = req.body
	// Find user by Email
	const user = await User.findOne({ email })
	
	if(!user) return res.status(400).send('Email not found')
	
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

module.exports = { registerUser, login }
