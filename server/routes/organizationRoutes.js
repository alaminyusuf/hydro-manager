const express = require('express')
const router = express.Router()
const {
	createOrganization,
	getOrganizations,
	addMember,
} = require('../controllers/organizationController')
const { protect } = require('../middleware/authMiddleware')

router.use(protect)

router.route('/').get(getOrganizations).post(createOrganization)
router.post('/:id/members', addMember)

module.exports = router
