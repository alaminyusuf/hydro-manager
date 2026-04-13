const express = require('express')
const router = express.Router()
const { registerUser, login } = require('../controllers/userController')

// Public Routes
/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     responses:
 *       201:
 *         description: User registered successfully
 */
router.post('/', registerUser)

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Authenticate user
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Login successful, returns JWT
 */
router.post('/login', login)

module.exports = router
