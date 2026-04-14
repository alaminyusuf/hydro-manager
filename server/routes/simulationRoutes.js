const express = require('express')
const router = express.Router()
const { startSim, resetSim, simStatus } = require('../controllers/simulationController')

/**
 * @swagger
 * /api/simulation/start:
 *   post:
 *     summary: Start the demo simulation
 *     tags: [Simulation]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               intervalsSec:
 *                 type: array
 *                 items:
 *                   type: number
 *                 description: "Optional: array of 5 delays in seconds [setup→seeding, seeding→growing, growing→harvesting, harvesting→completed, completed→done]. Default: [60,180,180,180,30]"
 *                 example: [30, 60, 60, 60, 15]
 *     responses:
 *       202:
 *         description: Simulation started
 *       409:
 *         description: Simulation already running
 */
router.post('/start', startSim)

/**
 * @swagger
 * /api/simulation/reset:
 *   post:
 *     summary: Reset and clean up all simulation data
 *     tags: [Simulation]
 *     responses:
 *       200:
 *         description: Simulation reset successfully
 */
router.post('/reset', resetSim)

/**
 * @swagger
 * /api/simulation/status:
 *   get:
 *     summary: Get current simulation status and event log
 *     tags: [Simulation]
 *     responses:
 *       200:
 *         description: Current simulation state
 */
router.get('/status', simStatus)

module.exports = router
