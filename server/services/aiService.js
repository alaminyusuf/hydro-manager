/**
 * AI Service for Hydroponic Insights
 * Includes anomaly detection and growth predictions.
 */

/**
 * Detects anomalies in a series of logs (pH or EC)
 * Uses Z-score calculation to find data points that are more than 2 standard deviations from the mean.
 * @param {Array} logs - Array of objects with 'value' and 'loggedAt'
 * @returns {Array} - Array of anomalous data points
 */
const detectAnomalies = (logs) => {
	if (!logs || logs.length < 5) return []

	const values = logs.map((l) => l.value)
	const mean = values.reduce((a, b) => a + b, 0) / values.length
	const stdDev = Math.sqrt(
		values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
	)

	if (stdDev === 0) return []

	return logs
		.map((log) => ({
			...log,
			zScore: Math.abs((log.value - mean) / stdDev),
		}))
		.filter((log) => log.zScore > 2)
}

/**
 * Predicts harvest date based on current growth progress
 * @param {Object} batch - The CropBatch object
 * @returns {Date|null} - Predicted harvest date
 */
const predictHarvestDate = (batch) => {
	if (!batch.startDate || batch.status === 'completed' || batch.status === 'harvesting') {
		return batch.harvestDate || null
	}

	const start = new Date(batch.startDate)
	const now = new Date()
	const daysPassed = Math.floor((now - start) / (1000 * 60 * 60 * 24))

	// Simple estimation based on crop types (averages in days)
	const cropExpectedDays = {
		Lettuce: 30,
		Herbs: 45,
		Tomato: 60,
		Other: 40,
	}

	const expectedDays = cropExpectedDays[batch.cropType] || 40
	
	// If progress is slow (e.g., pH/EC issues), we could adjust this.
	// For now, it's a basic prediction: startDate + expectedDays
	const predicted = new Date(start)
	predicted.setDate(start.getDate() + expectedDays)

	return predicted
}

/**
 * Generates an overall health score (0-100) based on anomalies
 * @param {Array} phAnomalies 
 * @param {Array} ecAnomalies 
 * @returns {Number}
 */
const calculateHealthScore = (phAnomalies, ecAnomalies) => {
    let score = 100
    score -= (phAnomalies.length * 10)
    score -= (ecAnomalies.length * 10)
    return Math.max(0, score)
}

module.exports = {
	detectAnomalies,
	predictHarvestDate,
    calculateHealthScore
}
