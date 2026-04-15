const request = require('supertest')
const express = require('express')
const User = require('../models/User')
const Organization = require('../models/Organization')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

// Setup express app for testing
const app = express()
app.use(express.json())
app.use('/api/users', require('../routes/userRoutes'))

// Simple error handler
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode
    res.status(statusCode).json({ message: err.message })
})

describe('User Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(Organization, 'create').mockResolvedValue({ _id: 'orgid' })
    })

    describe('POST /api/users', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                full_Name: 'Test User',
                email: 'test@example.com',
                username: 'testuser',
                password: 'password123'
            }

            jest.spyOn(User, 'findOne').mockResolvedValue(null)
            jest.spyOn(User, 'create').mockResolvedValue({
                _id: 'userid',
                ...userData,
                password: 'hashedpassword',
                organizations: [],
                save: jest.fn().mockResolvedValue(this)
            })
            jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedpassword')

            const res = await request(app).post('/api/users').send(userData)

            expect(res.statusCode).toEqual(201)
            expect(res.body).toHaveProperty('token')
            expect(res.body.username).toBe(userData.username)
            expect(User.create).toHaveBeenCalled()
            expect(Organization.create).toHaveBeenCalled()
        })

        it('should return 400 if user already exists', async () => {
            jest.spyOn(User, 'findOne').mockResolvedValue({ _id: 'existing' })

            const res = await request(app).post('/api/users').send({
                full_Name: 'Test',
                email: 'test@example.com',
                username: 'test',
                password: 'password'
            })

            expect(res.statusCode).toEqual(400)
            expect(res.body.message).toMatch(/already exists/)
        })
    })

    describe('POST /api/users/login', () => {
        it('should login successfully with correct credentials', async () => {
            const userData = {
                _id: 'userid',
                email: 'test@example.com',
                password: 'hashedpassword',
                username: 'testuser',
                full_Name: 'Test User'
            }

            jest.spyOn(User, 'findOne').mockResolvedValue(userData)
            jest.spyOn(bcrypt, 'compare').mockResolvedValue(true)

            const res = await request(app).post('/api/users/login').send({
                email: 'test@example.com',
                password: 'password123'
            })

            expect(res.statusCode).toEqual(200)
            expect(res.body).toHaveProperty('token')
            expect(res.body.username).toBe(userData.username)
        })

        it('should return 401 for invalid credentials', async () => {
            jest.spyOn(User, 'findOne').mockResolvedValue(null)

            const res = await request(app).post('/api/users/login').send({
                email: 'wrong@example.com',
                password: 'password'
            })

            expect(res.statusCode).toEqual(401)
            expect(res.body.message).toMatch(/Invalid email or password/)
        })
    })
})
