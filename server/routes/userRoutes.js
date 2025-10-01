const express = require('express')
const router = express.Router()
const { registerUser, authUser } = require('../controllers/userController')

// Public Routes
router.post('/', registerUser) // POST /api/users (Register a new user)
router.post('/login', authUser) // POST /api/users/login (Authenticate and get token)

module.exports = router
