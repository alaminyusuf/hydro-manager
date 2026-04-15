const asyncHandler = require('express-async-handler')
const simulationEngine = require('../services/simulationEngine')

// @desc  Start demo simulation
// @route POST /api/simulation/start
const startSim = asyncHandler(async (req, res) => {
	// Optional: allow caller to pass custom intervals (in seconds) for a faster demo
	const { intervalsSec } = req.body
	const intervals = Array.isArray(intervalsSec)
		? intervalsSec.map((s) => s * 1000)
		: undefined

	try {
		const status = simulationEngine.getStatus()
		if (status.running) {
			res.status(409)
			throw new Error('Simulation is already running. Reset it first.')
		}

		// Start async – don't await the full run, just fire it
		simulationEngine.startSimulation({ intervals }).catch((err) => {
			console.error('[Simulation] Fatal error:', err)
		})

		res.status(202).json({
			message: 'Simulation started.',
			note: 'Listen for Socket.io events on "sim:update" and "sim:finished".',
			status: simulationEngine.getStatus(),
		})
	} catch (err) {
		console.error('[Simulation Controller Error]', err.message);
		throw err;
	}
})

// @desc  Reset / clean up simulation data
// @route POST /api/simulation/reset
const resetSim = asyncHandler(async (req, res) => {
	const result = await resetSimulation()
	res.json({ message: 'Simulation reset. All demo data deleted.', ...result })
})

// @desc  Get current simulation status
// @route GET /api/simulation/status
const simStatus = asyncHandler(async (req, res) => {
	res.json(simulationEngine.getStatus())
})

module.exports = { startSim, resetSim, simStatus }
