const express = require('express')
const router = express.Router()
const {
	createOrganization,
	getOrganizations,
	addMember,
	removeMember,
	updateMemberRole,
} = require('../controllers/organizationController')
const { protect } = require('../middleware/authMiddleware')
const { tenantHandler } = require('../middleware/tenantMiddleware')
const { authorize } = require('../middleware/rbacMiddleware')

// All routes require authentication
router.use(protect)

// Org listing & creation (no tenant context needed)
router.route('/').get(getOrganizations).post(createOrganization)

// Member management (requires tenant context + role authorization)
router.post('/:id/members', tenantHandler, authorize('owner', 'admin'), addMember)
router.delete('/:id/members/:userId', tenantHandler, authorize('owner', 'admin'), removeMember)
router.put('/:id/members/:userId/role', tenantHandler, authorize('owner'), updateMemberRole)

module.exports = router
