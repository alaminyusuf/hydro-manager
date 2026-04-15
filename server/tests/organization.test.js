const request = require('supertest')
const express = require('express')
const Organization = require('../models/Organization')
const User = require('../models/User')
const Notification = require('../models/Notification')

// Mock middlewares
jest.mock('../middleware/authMiddleware', () => ({
    protect: (req, res, next) => {
        req.user = { _id: '507f1f77bcf86cd799439011', username: 'alice', email: 'alice@example.com' }
        next()
    },
}))

let mockOrgData = {
    _id: '507f1f77bcf86cd799439012',
    owner: '507f1f77bcf86cd799439011',
    members: [
        { user: '507f1f77bcf86cd799439011', role: 'owner' }
    ],
    settings: { maxMembers: 5 },
    save: jest.fn().mockResolvedValue(this)
}

jest.mock('../middleware/tenantMiddleware', () => ({
    tenantHandler: (req, res, next) => {
        req.tenantId = '507f1f77bcf86cd799439012'
        req.organization = mockOrgData
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
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode
    res.status(statusCode).json({ message: err.message })
})

describe('Organization Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(Notification, 'create').mockResolvedValue({})
    })

    describe('GET /api/organizations', () => {
        it('should return all organizations for the user', async () => {
            const mockOrgs = [{ name: 'Org 1' }, { name: 'Org 2' }]
            jest.spyOn(Organization, 'find').mockResolvedValue(mockOrgs)

            const res = await request(app).get('/api/organizations')

            expect(res.statusCode).toEqual(200)
            expect(res.body).toEqual(mockOrgs)
            expect(Organization.find).toHaveBeenCalledWith({ 'members.user': '507f1f77bcf86cd799439011' })
        })
    })

    describe('POST /api/organizations', () => {
        it('should create a new organization', async () => {
            const orgData = { name: 'New Farm' }
            const mockUser = {
                _id: '507f1f77bcf86cd799439011',
                username: 'alice',
                email: 'alice@example.com',
                save: jest.fn()
            }
            const mockOrg = { _id: 'orgid', ...orgData, owner: mockUser._id }

            jest.spyOn(User, 'findById').mockReturnValue({
                populate: jest.fn().mockResolvedValue({ ...mockUser, isPremium: false, organizations: [] })
            })
            jest.spyOn(Organization, 'find').mockResolvedValue([])
            jest.spyOn(Organization, 'create').mockResolvedValue(mockOrg)
            jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue(mockUser)

            const res = await request(app).post('/api/organizations').send(orgData)

            expect(res.statusCode).toEqual(201)
            expect(res.body.name).toBe(orgData.name)
            expect(Organization.create).toHaveBeenCalled()
            expect(User.findByIdAndUpdate).toHaveBeenCalled()
        })
    })

    describe('POST /api/organizations/:id/members', () => {
        it('should add a member to the organization', async () => {
            const mockOrg = {
                _id: 'orgid',
                members: [],
                save: jest.fn().mockResolvedValue(this)
            }
            const mockUserToAdd = {
                _id: 'bobid',
                username: 'bob',
                email: 'bob@example.com',
                save: jest.fn()
            }
            mockOrgData.members = [{ user: '507f1f77bcf86cd799439011', role: 'owner' }]
            mockOrgData.save.mockClear()

            jest.spyOn(Organization, 'findById').mockResolvedValue(mockOrgData)
            jest.spyOn(User, 'findOne').mockResolvedValue(mockUserToAdd)
            jest.spyOn(User, 'findById').mockResolvedValue(mockUserToAdd)

            const res = await request(app)
                .post('/api/organizations/orgid/members')
                .send({ email: 'bob@example.com', role: 'manager' })

            expect(res.statusCode).toEqual(200)
            expect(mockOrgData.save).toHaveBeenCalled()
            expect(User.findByIdAndUpdate).toHaveBeenCalled()
        })
    })

    describe('DELETE /api/organizations/:id/members/:userId', () => {
        it('should remove a member from the organization', async () => {
            const mockUserToRemove = { _id: 'newuser', save: jest.fn() }
            mockOrgData.members = [
                { user: '507f1f77bcf86cd799439011', role: 'owner' },
                { user: 'newuser', role: 'member' }
            ]
            mockOrgData.save.mockClear()

            jest.spyOn(Organization, 'findById').mockResolvedValue(mockOrgData)
            jest.spyOn(User, 'findById').mockResolvedValue(mockUserToRemove)
            jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue(mockUserToRemove)

            const res = await request(app)
                .delete('/api/organizations/orgid/members/newuser')

            expect(res.statusCode).toEqual(200)
            expect(mockOrgData.save).toHaveBeenCalled()
            expect(User.findByIdAndUpdate).toHaveBeenCalled()
        })
    })
})
