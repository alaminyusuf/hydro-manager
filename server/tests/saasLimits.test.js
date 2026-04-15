const request = require('supertest')
const express = require('express')
const mongoose = require('mongoose')
const Organization = require('../models/Organization')
const User = require('../models/User')

// Mock middlewares
let mockUser = { _id: new mongoose.Types.ObjectId(), isPremium: false, organizations: [] }

jest.mock('../middleware/authMiddleware', () => ({
    protect: (req, res, next) => {
        req.user = mockUser
        next()
    },
}))

jest.mock('../middleware/tenantMiddleware', () => ({
    tenantHandler: (req, res, next) => {
        req.tenantId = '507f1f77bcf86cd799439012'
        next()
    },
}))

jest.mock('../middleware/rbacMiddleware', () => ({
    authorize: (...roles) => (req, res, next) => next(),
}))

const app = express()
app.use(express.json())
app.use('/api/organizations', require('../routes/organizationRoutes'))

// Error handler
app.use((err, req, res, next) => {
    res.status(res.statusCode || 500).json({ message: err.message })
})

describe('SaaS Farm Limits', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockUser = { _id: new mongoose.Types.ObjectId(), isPremium: false, organizations: [] }
    })

    it('should allow a free user to create their first farm', async () => {
        jest.spyOn(User, 'findById').mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockUser)
        })
        jest.spyOn(Organization, 'find').mockResolvedValue([])
        jest.spyOn(Organization, 'create').mockResolvedValue({ _id: 'org1', name: 'Farm 1' })
        jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue(mockUser)

        const res = await request(app).post('/api/organizations').send({ name: 'Farm 1' })

        expect(res.statusCode).toEqual(201)
    })

    it('should block a free user from creating a second farm', async () => {
        mockUser.organizations = ['org1']
        jest.spyOn(User, 'findById').mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockUser)
        })
        jest.spyOn(Organization, 'find').mockResolvedValue([{ owner: mockUser._id }])

        const res = await request(app).post('/api/organizations').send({ name: 'Farm 2' })

        expect(res.statusCode).toEqual(403)
        expect(res.body.message).toMatch(/Free users can only own one farm/)
    })

    it('should block a free user from joining a third farm if they already have 2', async () => {
        mockUser.organizations = ['org1', 'org2']
        jest.spyOn(User, 'findById').mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockUser)
        })
        jest.spyOn(Organization, 'find').mockResolvedValue([{ owner: mockUser._id }])

        const res = await request(app).post('/api/organizations').send({ name: 'Farm 3' })

        expect(res.statusCode).toEqual(403)
        expect(res.body.message).toMatch(/Free users can only be part of up to 2 farms total/)
    })

    it('should allow a premium user to create more than one farm', async () => {
        mockUser.isPremium = true
        mockUser.organizations = ['org1']
        jest.spyOn(User, 'findById').mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockUser)
        })
        jest.spyOn(Organization, 'find').mockResolvedValue([{ owner: mockUser._id }])
        jest.spyOn(Organization, 'create').mockResolvedValue({ _id: 'org2', name: 'Farm 2' })
        jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue(mockUser)

        const res = await request(app).post('/api/organizations').send({ name: 'Farm 2' })

        expect(res.statusCode).toEqual(201)
    })
})
