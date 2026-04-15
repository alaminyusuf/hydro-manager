const request = require('supertest')
const express = require('express')
const mongoose = require('mongoose')
const CropBatch = require('../models/CropBatch')

// Mock AI service
jest.mock('../services/aiService', () => ({
    detectAnomalies: jest.fn().mockReturnValue([]),
    predictHarvestDate: jest.fn().mockReturnValue(new Date('2026-04-10')),
    calculateHealthScore: jest.fn().mockReturnValue(100)
}))

// Mock notification service
jest.mock('../services/notificationService', () => ({
    createNotification: jest.fn().mockResolvedValue({}),
    createBulkNotifications: jest.fn().mockResolvedValue({})
}))

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
        req.organization = {
            _id: '507f1f77bcf86cd799439012',
            members: [
                { user: '507f1f77bcf86cd799439011', role: 'owner' },
                { user: '507f1f77bcf86cd799439022', role: 'member' }
            ]
        }
        next()
    },
}))

jest.mock('../middleware/rbacMiddleware', () => ({
	authorize: (...roles) => (req, res, next) => next(),
}))

const app = express()
app.use(express.json())
app.use('/api/batches', require('../routes/cropBatchRoutes'))

// Simple error handler for testing
app.use((err, req, res, next) => {
    res.status(res.statusCode || 500).json({ message: err.message })
})

describe('Crop Batch Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('GET /api/batches', () => {
        it('should return all batches for the organization', async () => {
            const mockBatches = [{ name: 'Test Batch', organization: '507f1f77bcf86cd799439012' }]
            jest.spyOn(CropBatch, 'find').mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    sort: jest.fn().mockResolvedValue(mockBatches)
                })
            })

            const res = await request(app).get('/api/batches')
            expect(res.statusCode).toEqual(200)
            expect(res.body).toEqual(mockBatches)
        })
    })

    describe('GET /api/batches/my-assignments', () => {
        it('should return batches assigned to the current user', async () => {
            const mockBatches = [{ name: 'My Batch', assignedTo: ['507f1f77bcf86cd799439011'] }]
            jest.spyOn(CropBatch, 'find').mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    sort: jest.fn().mockResolvedValue(mockBatches)
                })
            })

            const res = await request(app).get('/api/batches/my-assignments')
            expect(res.statusCode).toEqual(200)
            expect(res.body).toEqual(mockBatches)
            expect(CropBatch.find).toHaveBeenCalledWith(expect.objectContaining({
                assignedTo: '507f1f77bcf86cd799439011'
            }))
        })
    })

    describe('POST /api/batches', () => {
        it('should create a new batch', async () => {
            const newBatchData = {
                name: 'Lettuce Batch 1',
                cropType: 'Lettuce',
                startDate: new Date(),
            }
            jest.spyOn(CropBatch, 'create').mockResolvedValue({ _id: '507f1f77bcf86cd799439013', ...newBatchData })

            const res = await request(app).post('/api/batches').send(newBatchData)
            expect(res.statusCode).toEqual(201)
            expect(res.body.name).toBe(newBatchData.name)
            expect(CropBatch.create).toHaveBeenCalled()
        })

        it('should return 400 if required fields are missing', async () => {
            const res = await request(app).post('/api/batches').send({ name: 'Incomplete' })
            expect(res.statusCode).toEqual(400)
            expect(res.body.message).toBeDefined()
        })
    })

    describe('PUT /api/batches/:id/log', () => {
        it('should log a pH reading', async () => {
            const mockBatch = {
                _id: '507f1f77bcf86cd799439013',
                pHLog: [],
                ecLog: [],
                save: jest.fn().mockResolvedValue(this)
            }
            jest.spyOn(CropBatch, 'findOne').mockResolvedValue(mockBatch)

            const res = await request(app)
                .put('/api/batches/507f1f77bcf86cd799439013/log')
                .send({ type: 'pH', value: 6.5 })

            expect(res.statusCode).toEqual(200)
            expect(mockBatch.pHLog.length).toBe(1)
            expect(mockBatch.pHLog[0].value).toBe(6.5)
            expect(mockBatch.save).toHaveBeenCalled()
        })
    })

    describe('GET /api/batches/:id', () => {
        it('should return batch details with valid ID', async () => {
            const mockBatch = {
                _id: '507f1f77bcf86cd799439013',
                name: 'Batch Detail Test',
                organization: '507f1f77bcf86cd799439012'
            }
            jest.spyOn(CropBatch, 'findOne').mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockResolvedValue(mockBatch)
                })
            })

            const res = await request(app).get('/api/batches/507f1f77bcf86cd799439013')
            expect(res.statusCode).toEqual(200)
            expect(res.body.batchDetails.name).toBe('Batch Detail Test')
        })

        it('should return 404 for non-existent batch', async () => {
            jest.spyOn(CropBatch, 'findOne').mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockResolvedValue(null)
                })
            })

            const res = await request(app).get('/api/batches/507f1f77bcf86cd799439013')
            expect(res.statusCode).toEqual(404)
        })
    })

    describe('PUT /api/batches/:id/harvest', () => {
        it('should update harvest date', async () => {
            const startDate = new Date()
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)

            const mockBatch = {
                _id: '507f1f77bcf86cd799439013',
                startDate,
                save: jest.fn().mockResolvedValue(this)
            }
            jest.spyOn(CropBatch, 'findOne').mockResolvedValue(mockBatch)

            const res = await request(app)
                .put('/api/batches/507f1f77bcf86cd799439013/harvest')
                .send({ harvestDate: tomorrow })

            expect(res.statusCode).toEqual(200)
            expect(mockBatch.harvestDate.toISOString()).toBe(tomorrow.toISOString())
        })

        it('should return 400 if harvest date is before start date', async () => {
            const startDate = new Date('2026-04-01')
            const beforeDate = new Date('2026-03-31')

            const mockBatch = {
                _id: '507f1f77bcf86cd799439013',
                startDate,
                save: jest.fn()
            }
            jest.spyOn(CropBatch, 'findOne').mockResolvedValue(mockBatch)

            const res = await request(app)
                .put('/api/batches/507f1f77bcf86cd799439013/harvest')
                .send({ harvestDate: beforeDate })

            expect(res.statusCode).toEqual(400)
            expect(res.body.message).toContain('cannot be before the start date')
        })
    })

    describe('PUT /api/batches/:id/status', () => {
        it('should transition status from planning to seeding', async () => {
            const mockBatch = {
                _id: '507f1f77bcf86cd799439013',
                status: 'planning',
                name: 'Batch A',
                assignedTo: ['507f1f77bcf86cd799439011'],
                save: jest.fn().mockResolvedValue(this)
            }
            jest.spyOn(CropBatch, 'findOne').mockResolvedValue(mockBatch)

            const res = await request(app)
                .put('/api/batches/507f1f77bcf86cd799439013/status')
                .send({ status: 'seeding' })

            expect(res.statusCode).toEqual(200)
            expect(mockBatch.status).toBe('seeding')
        })

        it('should return 400 for invalid transition', async () => {
            const mockBatch = {
                _id: '507f1f77bcf86cd799439013',
                status: 'planning',
                save: jest.fn()
            }
            jest.spyOn(CropBatch, 'findOne').mockResolvedValue(mockBatch)

            const res = await request(app)
                .put('/api/batches/507f1f77bcf86cd799439013/status')
                .send({ status: 'completed' }) // invalid transition

            expect(res.statusCode).toEqual(400)
        })
    })

    describe('PUT /api/batches/:id/assign', () => {
        it('should assign valid members to a batch', async () => {
            const mockBatch = {
                _id: '507f1f77bcf86cd799439013',
                name: 'Batch to Assign',
                assignedTo: [],
                save: jest.fn().mockResolvedValue(this),
                populate: jest.fn().mockResolvedValue(this)
            }
            jest.spyOn(CropBatch, 'findOne').mockResolvedValue(mockBatch)

            const userIds = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439022']
            const res = await request(app)
                .put('/api/batches/507f1f77bcf86cd799439013/assign')
                .send({ userIds })

            expect(res.statusCode).toEqual(200)
            expect(mockBatch.assignedTo).toEqual(userIds)
            expect(mockBatch.save).toHaveBeenCalled()
            expect(mockBatch.populate).toHaveBeenCalledWith('assignedTo', 'full_Name username email')
        })

        it('should return 400 if any user is not a member of the org', async () => {
            const mockBatch = { _id: '507f1f77bcf86cd799439013' }
            jest.spyOn(CropBatch, 'findOne').mockResolvedValue(mockBatch)

            const res = await request(app)
                .put('/api/batches/507f1f77bcf86cd799439013/assign')
                .send({ userIds: ['outsider_id'] })

            expect(res.statusCode).toEqual(400)
            expect(res.body.message).toContain('not members of this organization')
        })
    })

    describe('GET /api/batches/:id/insights', () => {
        it('should return insights for a valid batch', async () => {
            const mockBatch = {
                _id: '507f1f77bcf86cd799439011',
                name: 'Test Batch',
                pHLog: [],
                ecLog: [],
                startDate: new Date(),
                cropType: 'Lettuce',
                status: 'growing'
            }
            jest.spyOn(CropBatch, 'findOne').mockResolvedValue(mockBatch)

            const res = await request(app).get('/api/batches/507f1f77bcf86cd799439011/insights')
            expect(res.statusCode).toEqual(200)
            expect(res.body.name).toBe('Test Batch')
            expect(res.body.insights).toBeDefined()
            expect(res.body.insights.healthScore).toBe(100)
        })
    })
})
