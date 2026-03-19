const express = require('express')
const router = express.Router()
const {
	getNotifications,
	markAsRead,
	markAllAsRead,
} = require('../controllers/notificationController')
const { protect } = require('../middleware/authMiddleware')

// All notification routes require authentication (no tenant context needed)
router.use(protect)

router.get('/', getNotifications)
router.put('/read-all', markAllAsRead)
router.put('/:id/read', markAsRead)

module.exports = router
