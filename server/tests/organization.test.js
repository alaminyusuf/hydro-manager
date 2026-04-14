const request = require('supertest')
const express = require('express')
const Organization = require('../models/Organization')
const User = require('../models/User')

// Mock middlewares
jest.mock('../middleware/authMiddleware', () => ({
    protect: (req, res, next) => {
        req.user = { _id: '507f1f77bcf86cd799439011' }
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

describe('Organization Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks()
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

            jest.spyOn(User, 'findById').mockResolvedValue(mockUser)
            jest.spyOn(Organization, 'create').mockResolvedValue(mockOrg)

            const res = await request(app).post('/api/organizations').send(orgData)

            expect(res.statusCode).toEqual(201)
            expect(res.body.name).toBe(orgData.name)
            expect(Organization.create).toHaveBeenCalled()
            expect(mockUser.save).toHaveBeenCalled()
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
                _id: 'newuser',
                username: 'bob',
                email: 'bob@example.com',
                save: jest.fn()
            }

            jest.spyOn(Organization, 'findById').mockResolvedValue(mockOrg)
            jest.spyOn(User, 'findOne').mockResolvedValue(mockUserToAdd)
            jest.spyOn(User, 'findById').mockResolvedValue(mockUserToAdd)

            const res = await request(app)
                .post('/api/organizations/orgid/members')
                .send({ email: 'bob@example.com', role: 'manager' })

            expect(res.statusCode).toEqual(200)
            expect(mockOrg.members.length).toBe(1)
            expect(mockOrg.members[0].user.toString()).toBe('newuser')
            expect(mockOrg.save).toHaveBeenCalled()
            expect(mockUserToAdd.save).toHaveBeenCalled()
        })
    })

    describe('DELETE /api/organizations/:id/members/:userId', () => {
        it('should remove a member from the organization', async () => {
            const mockOrg = {
                _id: 'orgid',
                members: [{ user: 'newuser' }],
                save: jest.fn().mockResolvedValue(this)
            }
            const mockUserToRemove = {
                _id: 'newuser',
                organizations: ['orgid'],
                save: jest.fn()
            }

            jest.spyOn(Organization, 'findById').mockResolvedValue(mockOrg)
            jest.spyOn(User, 'findById').mockResolvedValue(mockUserToRemove)

            const res = await request(app)
                .delete('/api/organizations/orgid/members/newuser')

            expect(res.statusCode).toEqual(200)
            expect(mockOrg.members.length).toBe(0)
            expect(mockOrg.save).toHaveBeenCalled()
            expect(mockUserToRemove.save).toHaveBeenCalled()
        })
    })
})
