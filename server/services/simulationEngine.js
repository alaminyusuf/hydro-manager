/**
 * Simulation Engine for Hydro Manager Demo
 * -----------------------------------------
 * Progresses a real crop batch through its full lifecycle within ~10–15 minutes.
 * Uses setTimeout chains (not cron) so intervals can be set at runtime.
 *
 * Stage timeline (default, all in ms):
 *   0: Setup        – immediate   – create users, org, batch (planning)
 *   1: Seeding      – +60s        – Manager: planning → seeding + logs
 *   2: Growing      – +180s       – Admin:   seeding  → growing + 5 readings + AI
 *   3: Harvesting   – +180s       – Manager: growing  → harvesting + 3 readings
 *   4: Completed    – +180s       – Admin:   harvesting → completed + AI summary
 *   5: Done         – +30s        – emit sim:finished
 */

const bcrypt = require('bcryptjs')
const mongoose = require('mongoose')
const User = require('../models/User')
const Organization = require('../models/Organization')
const CropBatch = require('../models/CropBatch')
const Notification = require('../models/Notification')
const { detectAnomalies, predictHarvestDate, calculateHealthScore } = require('./aiService')
const { createBulkNotifications } = require('./notificationService')
const socketService = require('../utils/socket')

// ─── State ────────────────────────────────────────────────────────────────────
let simState = {
	running: false,
	stage: 0,
	startedAt: null,
	events: [],
	batchId: null,
	orgId: null,
	users: {}, // { admin, manager, member1, member2 }
	timers: [],
}

const STAGE_LABELS = [
	'setup',
	'seeding',
	'growing',
	'harvesting',
	'completed',
	'finished',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emit(stage, actorRole, message, extra = {}) {
	const event = {
		stage: STAGE_LABELS[stage],
		stageIndex: stage,
		actorRole,
		message,
		timestamp: new Date().toISOString(),
		...extra,
	}
	simState.events.push(event)

	try {
		const io = socketService.getIO()
		io.emit('sim:update', event)
	} catch (_) {
		// Socket not ready yet – that's fine
	}
}

function scheduleStage(fn, delayMs) {
	const t = setTimeout(fn, delayMs)
	simState.timers.push(t)
}

function pHvalue() {
	// Normal lettuce pH range 5.5–6.5
	return parseFloat((5.5 + Math.random() * 1.0).toFixed(2))
}

function ecValue() {
	// Normal EC range 1.2–2.0 mS/cm
	return parseFloat((1.2 + Math.random() * 0.8).toFixed(2))
}

async function addLogs(batch, count) {
	for (let i = 0; i < count; i++) {
		batch.pHLog.push({ value: pHvalue() })
		batch.ecLog.push({ value: ecValue() })
	}
	await batch.save()
}

async function transitionStatus(batch, newStatus, actorId) {
	batch.status = newStatus
	if (newStatus === 'completed' && !batch.harvestDate) {
		batch.harvestDate = new Date()
	}
	await batch.save()
}

// ─── Stages ───────────────────────────────────────────────────────────────────

async function stageSetup(intervals) {
	simState.stage = 0
	emit(0, 'system', '🌱 Simulation starting – creating demo users, organisation, and batch…')

	const password = await bcrypt.hash('SimDemo@123', 10)

	// Create 4 users
	const suffix = Date.now()
	const admin = await User.create({
		full_Name: 'Alice Admin',
		email: `alice.admin.${suffix}@sim.demo`,
		username: `alice_admin_${suffix}`,
		password,
		isSimulation: true,
	})
	const manager = await User.create({
		full_Name: 'Bob Manager',
		email: `bob.manager.${suffix}@sim.demo`,
		username: `bob_manager_${suffix}`,
		password,
		isSimulation: true,
	})
	const member1 = await User.create({
		full_Name: 'Carol Member',
		email: `carol.member.${suffix}@sim.demo`,
		username: `carol_member_${suffix}`,
		password,
		isSimulation: true,
	})
	const member2 = await User.create({
		full_Name: 'Dave Member',
		email: `dave.member.${suffix}@sim.demo`,
		username: `dave_member_${suffix}`,
		password,
		isSimulation: true,
	})

	simState.users = { admin, manager, member1, member2 }

	// Create org
	const org = await Organization.create({
		name: `SimFarm Demo ${suffix}`,
		owner: admin._id,
		isSimulation: true,
		subscription: { status: 'active', plan: 'pro' },
		members: [
			{ user: admin._id, role: 'admin', username: admin.username, email: admin.email },
			{ user: manager._id, role: 'manager', username: manager.username, email: manager.email },
			{ user: member1._id, role: 'member', username: member1.username, email: member1.email },
			{ user: member2._id, role: 'member', username: member2.username, email: member2.email },
		],
	})

	simState.orgId = org._id

	// Add org to users
	await User.updateMany({ _id: { $in: [admin._id, manager._id, member1._id, member2._id] } }, { $push: { organizations: org._id } })

	// Create batch in planning
	const batch = await CropBatch.create({
		user: admin._id,
		organization: org._id,
		name: 'Demo Lettuce Batch',
		cropType: 'Lettuce',
		startDate: new Date(),
		status: 'planning',
		assignedTo: [admin._id, manager._id, member1._id, member2._id],
		isSimulation: true,
	})

	simState.batchId = batch._id

	emit(0, 'admin', `✅ Setup complete! Org "${org.name}" created with 4 members. Batch "${batch.name}" is in PLANNING.`, {
		batchId: batch._id,
		orgId: org._id,
		users: {
			admin: { id: admin._id, name: admin.full_Name, role: 'admin' },
			manager: { id: manager._id, name: manager.full_Name, role: 'manager' },
			member1: { id: member1._id, name: member1.full_Name, role: 'member' },
			member2: { id: member2._id, name: member2.full_Name, role: 'member' },
		},
	})

	scheduleStage(() => stageSeeding(), intervals[0])
}

async function stageSeeding() {
	simState.stage = 1
	const { manager, admin, member1, member2 } = simState.users
	emit(1, 'manager', '🌿 Bob (Manager) is transitioning batch from PLANNING → SEEDING and logging initial readings…')

	const batch = await CropBatch.findById(simState.batchId)
	await transitionStatus(batch, 'seeding', manager._id)
	await addLogs(batch, 2)

	// Notifications to members
	await createBulkNotifications([
		{ recipient: member1._id, organization: simState.orgId, type: 'batch_status_changed', title: 'Batch Seeding Started', message: `"${batch.name}" has moved to SEEDING. Time to prepare the grow trays!`, relatedBatch: batch._id },
		{ recipient: member2._id, organization: simState.orgId, type: 'batch_status_changed', title: 'Batch Seeding Started', message: `"${batch.name}" has moved to SEEDING. Time to prepare the grow trays!`, relatedBatch: batch._id },
		{ recipient: admin._id, organization: simState.orgId, type: 'batch_status_changed', title: 'Batch Seeding Started', message: `Bob has started seeding on "${batch.name}".`, relatedBatch: batch._id },
	])

	emit(1, 'manager', `✅ Batch is now SEEDING. Initial pH: ${batch.pHLog.at(-1).value}, EC: ${batch.ecLog.at(-1).value}. Notifications sent to team.`, { batchStatus: 'seeding' })

	const { intervals } = simState
	scheduleStage(() => stageGrowing(), intervals[1])
}

async function stageGrowing() {
	simState.stage = 2
	const { admin, manager } = simState.users
	emit(2, 'admin', '📈 Alice (Admin) is transitioning SEEDING → GROWING and logging 5 days of sensor readings…')

	const batch = await CropBatch.findById(simState.batchId)
	await transitionStatus(batch, 'growing', admin._id)
	await addLogs(batch, 5)

	// AI insights
	const reloaded = await CropBatch.findById(simState.batchId)
	const phAnomalies = detectAnomalies(reloaded.pHLog)
	const ecAnomalies = detectAnomalies(reloaded.ecLog)
	const healthScore = calculateHealthScore(phAnomalies, ecAnomalies)
	const predictedHarvest = predictHarvestDate(reloaded)

	await createBulkNotifications([
		{ recipient: manager._id, organization: simState.orgId, type: 'batch_status_changed', title: 'Growth Phase Active', message: `"${batch.name}" is GROWING. Health score: ${healthScore}/100.`, relatedBatch: batch._id },
	])

	emit(2, 'ai', `🤖 AI Analysis complete. Health Score: ${healthScore}/100. pH anomalies: ${phAnomalies.length}. EC anomalies: ${ecAnomalies.length}. Predicted harvest: ${predictedHarvest ? new Date(predictedHarvest).toLocaleDateString() : 'TBD'}.`, {
		batchStatus: 'growing',
		healthScore,
		phAnomalies: phAnomalies.length,
		ecAnomalies: ecAnomalies.length,
		predictedHarvest,
	})

	scheduleStage(() => stageHarvesting(), simState.intervals[2])
}

async function stageHarvesting() {
	simState.stage = 3
	const { manager, member1, member2 } = simState.users
	emit(3, 'manager', '🌾 Bob (Manager) is transitioning GROWING → HARVESTING. Members Carol & Dave logging final readings…')

	const batch = await CropBatch.findById(simState.batchId)
	await transitionStatus(batch, 'harvesting', manager._id)
	await addLogs(batch, 3)

	await createBulkNotifications([
		{ recipient: member1._id, organization: simState.orgId, type: 'batch_status_changed', title: 'Harvest Time!', message: `"${batch.name}" is entering HARVEST phase. Begin harvest procedures.`, relatedBatch: batch._id },
		{ recipient: member2._id, organization: simState.orgId, type: 'batch_status_changed', title: 'Harvest Time!', message: `"${batch.name}" is entering HARVEST phase. Begin harvest procedures.`, relatedBatch: batch._id },
	])

	emit(3, 'manager', `✅ Batch is now HARVESTING. Final pH: ${batch.pHLog.at(-1).value}, EC: ${batch.ecLog.at(-1).value}. Crew notified.`, { batchStatus: 'harvesting' })

	scheduleStage(() => stageCompleted(), simState.intervals[3])
}

async function stageCompleted() {
	simState.stage = 4
	const { admin, manager, member1, member2 } = simState.users
	emit(4, 'admin', '🎉 Alice (Admin) is marking the batch as COMPLETED. Running final AI health report…')

	const batch = await CropBatch.findById(simState.batchId)
	await transitionStatus(batch, 'completed', admin._id)

	const reloaded = await CropBatch.findById(simState.batchId)
	const phAnomalies = detectAnomalies(reloaded.pHLog)
	const ecAnomalies = detectAnomalies(reloaded.ecLog)
	const healthScore = calculateHealthScore(phAnomalies, ecAnomalies)

	await createBulkNotifications([
		{ recipient: manager._id, organization: simState.orgId, type: 'batch_status_changed', title: 'Harvest Complete!', message: `"${batch.name}" has been successfully COMPLETED. Great work team!`, relatedBatch: batch._id },
		{ recipient: member1._id, organization: simState.orgId, type: 'batch_status_changed', title: 'Harvest Complete!', message: `"${batch.name}" has been successfully COMPLETED. Great work!`, relatedBatch: batch._id },
		{ recipient: member2._id, organization: simState.orgId, type: 'batch_status_changed', title: 'Harvest Complete!', message: `"${batch.name}" has been successfully COMPLETED. Great work!`, relatedBatch: batch._id },
	])

	emit(4, 'ai', `🤖 Final AI Report — Health Score: ${healthScore}/100. Total pH readings: ${reloaded.pHLog.length}. Total EC readings: ${reloaded.ecLog.length}. Batch completed on ${new Date().toLocaleDateString()}.`, {
		batchStatus: 'completed',
		healthScore,
		totalReadings: reloaded.pHLog.length,
	})

	scheduleStage(() => stageDone(), simState.intervals[4])
}

async function stageDone() {
	simState.stage = 5
	simState.running = false

	emit(5, 'system', '🏁 Simulation complete! Full crop lifecycle demonstrated in under 15 minutes. Click Reset to clean up demo data.', {
		batchId: simState.batchId,
	})

	try {
		const io = socketService.getIO()
		io.emit('sim:finished', { batchId: simState.batchId })
	} catch (_) {}
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start the simulation
 * @param {Object} opts - { intervals: [ms, ms, ms, ms, ms] } (5 gaps between stages)
 */
async function startSimulation(opts = {}) {
	if (simState.running) throw new Error('Simulation already running.')

	const intervals = opts.intervals || [
		60_000,   // setup → seeding
		180_000,  // seeding → growing
		180_000,  // growing → harvesting
		180_000,  // harvesting → completed
		30_000,   // completed → done
	]

	// Reset state
	simState = {
		running: true,
		stage: 0,
		startedAt: new Date(),
		events: [],
		batchId: null,
		orgId: null,
		users: {},
		timers: [],
		intervals,
	}

	await stageSetup(intervals)
}

/**
 * Reset: cancel timers and delete all simulation data
 */
async function resetSimulation() {
	// Cancel pending timers
	simState.timers.forEach(clearTimeout)

	// Delete sim data
	await CropBatch.deleteMany({ isSimulation: true })
	await Organization.deleteMany({ isSimulation: true })
	await User.deleteMany({ isSimulation: true })
	await Notification.deleteMany({ organization: simState.orgId })

	const wasRunning = simState.running

	simState = {
		running: false,
		stage: 0,
		startedAt: null,
		events: [],
		batchId: null,
		orgId: null,
		users: {},
		timers: [],
	}

	try {
		const io = socketService.getIO()
		io.emit('sim:reset', { message: 'Simulation data cleared.' })
	} catch (_) {}

	return { deleted: true, wasRunning }
}

/**
 * Get current simulation status
 */
function getStatus() {
	return {
		running: simState.running,
		stage: STAGE_LABELS[simState.stage],
		stageIndex: simState.stage,
		startedAt: simState.startedAt,
		elapsedMs: simState.startedAt ? Date.now() - simState.startedAt.getTime() : 0,
		batchId: simState.batchId,
		orgId: simState.orgId,
		users: Object.fromEntries(
			Object.entries(simState.users).map(([k, u]) => [k, u ? { id: u._id, name: u.full_Name } : null])
		),
		events: simState.events,
	}
}

module.exports = { startSimulation, resetSimulation, getStatus }
