const asyncHandler = require('express-async-handler')
const Organization = require('../models/Organization')
const User = require('../models/User')

// @desc    Create a new organization
// @route   POST /api/organizations
// @access  Private
const createOrganization = asyncHandler(async (req, res) => {
	const { name } = req.body

	if (!name) {
		res.status(400)
		throw new Error('Please add an organization name')
	}

	const organization = await Organization.create({
		name,
		owner: req.user._id,
		members: [{ user: req.user._id, role: 'admin' }],
	})

	// Add organization to user's list
	await User.findByIdAndUpdate(req.user._id, {
		$push: { organizations: organization._id },
	})

	res.status(201).json(organization)
})

// @desc    Get user's organizations
// @route   GET /api/organizations
// @access  Private
const getOrganizations = asyncHandler(async (req, res) => {
	const organizations = await Organization.find({
		'members.user': req.user._id,
	})

	res.status(200).json(organizations)
})

// @desc    Add member to organization
// @route   POST /api/organizations/:id/members
// @access  Private/Admin
const addMember = asyncHandler(async (req, res) => {
	const { email, role } = req.body
	const orgId = req.params.id

	const org = await Organization.findById(orgId)

	if (!org) {
		res.status(404)
		throw new Error('Organization not found')
	}

	// Check if requester is admin
	const requesterMember = org.members.find(
		(m) => m.user.toString() === req.user._id.toString()
	)
	if (!requesterMember || requesterMember.role !== 'admin') {
		res.status(403)
		throw new Error('Only admins can add members')
	}

	const userToAdd = await User.findOne({ email })
	if (!userToAdd) {
		res.status(404)
		throw new Error('User not found')
	}

	// Check if already a member
	if (org.members.find((m) => m.user.toString() === userToAdd._id.toString())) {
		res.status(400)
		throw new Error('User is already a member')
	}

	org.members.push({ user: userToAdd._id, role: role || 'member' })
	await org.save()

	// Update user's organizations list
	await User.findByIdAndUpdate(userToAdd._id, {
		$push: { organizations: org._id },
	})

	res.status(200).json(org)
})

module.exports = {
	createOrganization,
	getOrganizations,
	addMember,
}
