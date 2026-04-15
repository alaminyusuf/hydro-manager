const asyncHandler = require('express-async-handler')
const Organization = require('../models/Organization')
const User = require('../models/User')
const { createNotification } = require('../services/notificationService')

// @desc    Create a new organization
// @route   POST /api/organizations
// @access  Private
const createOrganization = asyncHandler(async (req, res) => {
	const { name } = req.body

	if (!name) {
		res.status(400)
		throw new Error('Please add an organization name')
	}

	// SaaS Limits Check
	const user = await User.findById(req.user._id).populate('organizations')
	const ownedOrgs = await Organization.find({ owner: req.user._id })
	const ownedCount = ownedOrgs.length
	const totalCount = req.user.organizations?.length || 0

	if (!user.isPremium) {
		if (totalCount >= 2) {
			res.status(403)
			throw new Error('Free users can only be part of up to 2 farms total.')
		}
		if (ownedCount >= 1) {
			res.status(403)
			throw new Error('Free users can only own one farm. Upgrade to premium to create more.')
		}
	} else {
		// Premium limits - although user said "more than 5", I'll set a high limit or no limit for now.
		// If they want exactly 5 as a limit for some tier, they didn't specify.
		// "premium can own more than 5 farms" implies no strict low limit.
	}

	const organization = await Organization.create({
		name,
		owner: req.user._id,
		members: [{ user: req.user._id, role: 'owner', username: req.user.username, email: req.user.email }],
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
// @access  Private/Owner, Admin
const addMember = asyncHandler(async (req, res) => {
	const { email, role } = req.body
	const org = req.organization // Set by tenantHandler

	// Validate role
	const validRoles = ['admin', 'manager', 'member']
	const assignRole = role || 'member'
	if (!validRoles.includes(assignRole)) {
		res.status(400)
		throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`)
	}

	// Check member limit
	if (org.members.length >= org.settings.maxMembers) {
		res.status(400)
		throw new Error(
			`Organization member limit reached (${org.settings.maxMembers}). Upgrade your plan.`
		)
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

	org.members.push({ user: userToAdd._id, role: assignRole, username: userToAdd.username, email: userToAdd.email })
	await org.save()

	// Update user's organizations list
	await User.findByIdAndUpdate(userToAdd._id, {
		$push: { organizations: org._id },
	})

	res.status(200).json(org)

	// Send notification to the new member (fire-and-forget)
	createNotification({
		recipient: userToAdd._id,
		organization: org._id,
		type: 'member_added',
		title: 'You have been added to an organization',
		message: `You have been added to "${org.name}" as a ${assignRole}.`,
	})
})

// @desc    Remove member from organization
// @route   DELETE /api/organizations/:id/members/:userId
// @access  Private/Owner, Admin
const removeMember = asyncHandler(async (req, res) => {
	const org = req.organization
	const userIdToRemove = req.params.userId

	// Cannot remove the owner
	if (org.owner.toString() === userIdToRemove) {
		res.status(400)
		throw new Error('Cannot remove the organization owner')
	}

	const memberIndex = org.members.findIndex(
		(m) => m.user.toString() === userIdToRemove
	)

	if (memberIndex === -1) {
		res.status(404)
		throw new Error('Member not found in organization')
	}

	org.members.splice(memberIndex, 1)
	await org.save()

	// Remove org from user's list
	await User.findByIdAndUpdate(userIdToRemove, {
		$pull: { organizations: org._id },
	})

	res.status(200).json(org)

	// Notify the removed user
	createNotification({
		recipient: userIdToRemove,
		organization: org._id,
		type: 'member_removed',
		title: 'You have been removed from an organization',
		message: `You have been removed from "${org.name}".`,
	})
})

// @desc    Update a member's role
// @route   PUT /api/organizations/:id/members/:userId/role
// @access  Private/Owner
const updateMemberRole = asyncHandler(async (req, res) => {
	const org = req.organization
	const userIdToUpdate = req.params.userId
	const { role } = req.body

	const validRoles = ['admin', 'manager', 'member']
	if (!role || !validRoles.includes(role)) {
		res.status(400)
		throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`)
	}

	// Cannot change owner's role
	if (org.owner.toString() === userIdToUpdate) {
		res.status(400)
		throw new Error('Cannot change the owner\'s role')
	}

	const member = org.members.find(
		(m) => m.user.toString() === userIdToUpdate
	)

	if (!member) {
		res.status(404)
		throw new Error('Member not found in organization')
	}

	member.role = role
	await org.save()

	res.status(200).json(org)

	// Notify the member whose role changed
	createNotification({
		recipient: userIdToUpdate,
		organization: org._id,
		type: 'role_changed',
		title: 'Your role has been updated',
		message: `Your role in "${org.name}" has been changed to ${role}.`,
	})
})

module.exports = {
	createOrganization,
	getOrganizations,
	addMember,
	removeMember,
	updateMemberRole,
}
