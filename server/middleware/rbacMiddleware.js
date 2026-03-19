const authorize = (...allowedRoles) => {
	return (req, res, next) => {
		// req.organization is set by tenantMiddleware
		if (!req.organization) {
			res.status(500)
			throw new Error('Organization context not found. Ensure tenantHandler runs before authorize.')
		}

		const member = req.organization.members.find(
			(m) => m.user.toString() === req.user._id.toString()
		)

		if (!member) {
			res.status(403)
			throw new Error('You are not a member of this organization')
		}

		if (!allowedRoles.includes(member.role)) {
			res.status(403)
			throw new Error(
				`Role '${member.role}' is not authorized. Required: ${allowedRoles.join(', ')}`
			)
		}

		// Attach the member's role to the request for downstream use
		req.memberRole = member.role
		next()
	}
}

module.exports = { authorize }
