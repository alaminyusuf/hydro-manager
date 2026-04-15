const request = require('supertest')
const express = require('express')
const Expense = require('../models/Expense')

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
app.use('/api/expenses', require('../routes/expenseRoutes'))

// Error handler
app.use((err, req, res, next) => {
    res.status(res.statusCode || 500).json({ message: err.message })
})

describe('Expense Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('GET /api/expenses', () => {
        it('should return all transactions for the organization', async () => {
            const mockExpenses = [{ description: 'Seeds', amount: 50 }, { description: 'Nutrients', amount: 100 }]
            jest.spyOn(Expense, 'find').mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                populate: jest.fn().mockResolvedValue(mockExpenses)
            })

            const res = await request(app).get('/api/expenses')

            expect(res.statusCode).toEqual(200)
            expect(res.body).toEqual(mockExpenses)
            expect(Expense.find).toHaveBeenCalledWith({ organization: '507f1f77bcf86cd799439012' })
        })
    })

    describe('POST /api/expenses', () => {
        it('should add a new transaction', async () => {
            const expenseData = {
                description: 'New Light',
                amount: 200,
                category: 'Equipment',
                isIncome: false,
                date: new Date()
            }
            jest.spyOn(Expense, 'create').mockResolvedValue({ _id: 'expid', ...expenseData })

            const res = await request(app).post('/api/expenses').send(expenseData)

            expect(res.statusCode).toEqual(201)
            expect(res.body.description).toBe(expenseData.description)
            expect(Expense.create).toHaveBeenCalled()
        })
    })

    describe('GET /api/expenses/summary', () => {
        it('should return financial summary', async () => {
            const mockSummary = [
                { _id: 'Maintenance', total: 150 },
                { _id: 'Seeds', total: 50 }
            ]
            jest.spyOn(Expense, 'aggregate').mockResolvedValue(mockSummary)

            const res = await request(app).get('/api/expenses/summary')

            expect(res.statusCode).toEqual(200)
            expect(res.body.expensesByCategory).toBeDefined()
        })
    })
})
