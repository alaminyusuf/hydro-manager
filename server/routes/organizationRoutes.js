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

/**
 * @swagger
 * /api/organizations:
 *   get:
 *     summary: Get all organizations for the current user
 *     tags: [Organizations]
 *     responses:
 *       200:
 *         description: List of organizations
 *   post:
 *     summary: Create a new organization
 *     tags: [Organizations]
 *     responses:
 *       201:
 *         description: Organization created successfully
 */
router.route('/').get(getOrganizations).post(createOrganization)

/**
 * @swagger
 * /api/organizations/{id}/members:
 *   post:
 *     summary: Add a member to an organization
 *     tags: [Organizations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member added successfully
 */
router.post('/:id/members', tenantHandler, authorize('owner', 'admin'), addMember)

/**
 * @swagger
 * /api/organizations/{id}/members/{userId}:
 *   delete:
 *     summary: Remove a member from an organization
 *     tags: [Organizations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *       - in: path
 *         name: userId
 *         required: true
 *     responses:
 *       200:
 *         description: Member removed successfully
 */
router.delete('/:id/members/:userId', tenantHandler, authorize('owner', 'admin'), removeMember)

/**
 * @swagger
 * /api/organizations/{id}/members/{userId}/role:
 *   put:
 *     summary: Update a member's role
 *     tags: [Organizations]
 *     responses:
 *       200:
 *         description: Role updated successfully
 */
router.put('/:id/members/:userId/role', tenantHandler, authorize('owner'), updateMemberRole)

module.exports = router
