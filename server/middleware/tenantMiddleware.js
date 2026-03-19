const asyncHandler = require('express-async-handler')
const Organization = require('../models/Organization')

const tenantHandler = asyncHandler(async (req, res, next) => {
	const tenantId = req.headers['x-tenant-id']

	if (!tenantId) {
		res.status(400)
		throw new Error('Tenant ID is required in headers (x-tenant-id)')
	}

	// Verify that the user is a member of the organization
	const org = await Organization.findOne({
		_id: tenantId,
		'members.user': req.user._id,
	})

	if (!org) {
		res.status(403)
		throw new Error('You do not have access to this organization')
	}

	// Attach tenant info to request object
	req.tenantId = tenantId
	req.organization = org

	// Attach the user's role within the organization
	const member = org.members.find(
		(m) => m.user.toString() === req.user._id.toString()
	)
	req.memberRole = member ? member.role : null

	next()
})

module.exports = { tenantHandler }
