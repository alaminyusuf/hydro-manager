const { createNotification, createBulkNotifications } = require('../services/notificationService')
const Notification = require('../models/Notification')
const socketService = require('../utils/socket')
const mongoose = require('mongoose')

jest.mock('../models/Notification')
jest.mock('../utils/socket')

describe('Notification Service', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('createNotification', () => {
        const mockNotificationData = {
            recipient: new mongoose.Types.ObjectId(),
            organization: new mongoose.Types.ObjectId(),
            type: 'batch_status_changed',
            title: 'Batch Status Updated',
            message: 'Your batch status has changed to seeding',
            relatedBatch: new mongoose.Types.ObjectId()
        }

        it('should create a single notification successfully', async () => {
            const mockNotification = {
                ...mockNotificationData,
                _id: new mongoose.Types.ObjectId(),
                read: false,
                createdAt: new Date()
            }
            Notification.create.mockResolvedValue(mockNotification)
            const mockIO = { to: jest.fn().mockReturnThis(), emit: jest.fn() }
            socketService.getIO.mockReturnValue(mockIO)

            const result = await createNotification(mockNotificationData)

            expect(Notification.create).toHaveBeenCalled()
            expect(mockIO.to).toHaveBeenCalledWith(`user:${mockNotificationData.recipient}`)
            expect(mockIO.emit).toHaveBeenCalledWith('notification', mockNotification)
            expect(result.title).toBe(mockNotificationData.title)
        })

        it('should handle missing relatedBatch', async () => {
            const dataWithoutBatch = { ...mockNotificationData }
            delete dataWithoutBatch.relatedBatch

            Notification.create.mockResolvedValue({
                ...dataWithoutBatch,
                _id: new mongoose.Types.ObjectId()
            })

            await createNotification(dataWithoutBatch)

            expect(Notification.create).toHaveBeenCalledWith({
                ...dataWithoutBatch,
                relatedBatch: undefined
            })
        })

        it('should log error and return undefined on failure', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
            Notification.create.mockRejectedValue(new Error('DB Error'))

            const result = await createNotification(mockNotificationData)

            expect(result).toBeUndefined()
            expect(consoleSpy).toHaveBeenCalledWith('Error creating notification:', expect.any(Error))
            consoleSpy.mockRestore()
        })
    })

    describe('createBulkNotifications', () => {
        const mockNotifications = [
            {
                recipient: new mongoose.Types.ObjectId(),
                organization: new mongoose.Types.ObjectId(),
                type: 'member_added',
                title: 'Welcome',
                message: 'You have been added to the organization'
            },
            {
                recipient: new mongoose.Types.ObjectId(),
                organization: new mongoose.Types.ObjectId(),
                type: 'batch_assigned',
                title: 'New Assignment',
                message: 'A new batch has been assigned to you'
            }
        ]

        it('should create multiple notifications successfully', async () => {
            const mockDocs = mockNotifications.map(n => ({ ...n, _id: new mongoose.Types.ObjectId() }))
            Notification.insertMany.mockResolvedValue(mockDocs)
            const mockIO = { to: jest.fn().mockReturnThis(), emit: jest.fn() }
            socketService.getIO.mockReturnValue(mockIO)

            const result = await createBulkNotifications(mockNotifications)

            expect(Notification.insertMany).toHaveBeenCalledWith(mockNotifications)
            expect(mockIO.emit).toHaveBeenCalledTimes(2)
            expect(result).toHaveLength(2)
        })

        it('should log error and return undefined on failure', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
            Notification.insertMany.mockRejectedValue(new Error('Bulk DB Error'))

            const result = await createBulkNotifications(mockNotifications)

            expect(result).toBeUndefined()
            expect(consoleSpy).toHaveBeenCalledWith('Error creating bulk notifications:', expect.any(Error))
            consoleSpy.mockRestore()
        })
    })
})
