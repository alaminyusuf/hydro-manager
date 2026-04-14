const request = require('supertest')
const express = require('express')
const simulationEngine = require('../services/simulationEngine')

// Mock the simulation engine service
jest.mock('../services/simulationEngine', () => ({
    startSimulation: jest.fn().mockResolvedValue({}),
    resetSimulation: jest.fn().mockResolvedValue({ deleted: true, wasRunning: false }),
    getStatus: jest.fn().mockReturnValue({ running: false, stage: 'setup' })
}))

const app = express()
app.use(express.json())
app.use('/api/simulation', require('../routes/simulationRoutes'))

// Error handler
app.use((err, req, res, next) => {
    res.status(res.statusCode || 500).json({ message: err.message })
})

describe('Simulation Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('POST /api/simulation/start', () => {
        it('should start a simulation if not already running', async () => {
            const res = await request(app).post('/api/simulation/start')

            expect(res.statusCode).toEqual(202)
            expect(res.body.message).toBe('Simulation started.')
            expect(simulationEngine.startSimulation).toHaveBeenCalled()
        })

        it('should return 409 if simulation is already running', async () => {
            simulationEngine.getStatus.mockReturnValue({ running: true })

            const res = await request(app).post('/api/simulation/start')

            expect(res.statusCode).toEqual(409)
            expect(res.body.message).toContain('already running')
        })
    })

    describe('POST /api/simulation/reset', () => {
        it('should reset the simulation and clear data', async () => {
            const res = await request(app).post('/api/simulation/reset')

            expect(res.statusCode).toEqual(200)
            expect(res.body.message).toContain('Simulation reset')
            expect(simulationEngine.resetSimulation).toHaveBeenCalled()
        })
    })

    describe('GET /api/simulation/status', () => {
        it('should return the current simulation status', async () => {
            const res = await request(app).get('/api/simulation/status')

            expect(res.statusCode).toEqual(200)
            expect(res.body.running).toBe(false)
            expect(simulationEngine.getStatus).toHaveBeenCalled()
        })
    })
})
