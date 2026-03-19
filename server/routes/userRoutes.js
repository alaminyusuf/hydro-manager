const express = require('express')
const router = express.Router()
const { registerUser, login } = require('../controllers/userController')

// Public Routes
router.post('/', registerUser) // POST /api/users (Register a new user)
router.post('/login', login) // POST /api/users/login (Authenticate and get token)

module.exports = router
