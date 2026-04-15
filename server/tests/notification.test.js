const request = require('supertest')
const express = require('express')
const Notification = require('../models/Notification')

// Mock middlewares
jest.mock('../middleware/authMiddleware', () => ({
    protect: (req, res, next) => {
        req.user = { _id: '507f1f77bcf86cd799439011' }
        next()
    },
}))

const app = express()
app.use(express.json())
app.use('/api/notifications', require('../routes/notificationRoutes'))

// Error handler
app.use((err, req, res, next) => {
    res.status(res.statusCode || 500).json({ message: err.message })
})

describe('Notification Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('GET /api/notifications', () => {
        it('should return all notifications for the user', async () => {
            const mockNotifications = [{ title: 'New Batch' }, { title: 'Status Change' }]
            jest.spyOn(Notification, 'find').mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue(mockNotifications)
            })
            jest.spyOn(Notification, 'countDocuments').mockResolvedValue(0)

            const res = await request(app).get('/api/notifications')

            expect(res.statusCode).toEqual(200)
            expect(res.body.notifications).toEqual(mockNotifications)
            expect(Notification.find).toHaveBeenCalledWith({ recipient: '507f1f77bcf86cd799439011' })
        })
    })

    describe('PUT /api/notifications/read-all', () => {
        it('should mark all notifications as read', async () => {
            jest.spyOn(Notification, 'updateMany').mockResolvedValue({ modifiedCount: 5 })

            const res = await request(app).put('/api/notifications/read-all')

            expect(res.statusCode).toEqual(200)
            expect(res.body.message).toBe('All notifications marked as read')
            expect(Notification.updateMany).toHaveBeenCalledWith(
                { recipient: '507f1f77bcf86cd799439011', read: false },
                { read: true }
            )
        })
    })

    describe('PUT /api/notifications/:id/read', () => {
        it('should mark a single notification as read', async () => {
            const mockNotification = {
                _id: 'notifid',
                read: true
            }
            jest.spyOn(Notification, 'findOneAndUpdate').mockResolvedValue(mockNotification)

            const res = await request(app).put('/api/notifications/notifid/read')

            expect(res.statusCode).toEqual(200)
            expect(res.body.read).toBe(true)
            expect(Notification.findOneAndUpdate).toHaveBeenCalled()
        })
    })
})
