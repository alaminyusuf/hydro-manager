const { detectAnomalies, predictHarvestDate, calculateHealthScore } = require('../services/aiService')

describe('AI Service', () => {
	describe('detectAnomalies', () => {
		it('should return empty array if less than 5 logs', () => {
			const logs = [{ value: 7.0 }, { value: 7.1 }]
			expect(detectAnomalies(logs)).toEqual([])
		})

		it('should detect outliers (Z-score > 2)', () => {
			const logs = [
				{ value: 7.0 },
				{ value: 7.0 },
				{ value: 7.1 },
				{ value: 7.0 },
				{ value: 7.2 },
				{ value: 10.0 }, // Outlier
			]
			const anomalies = detectAnomalies(logs)
			expect(anomalies.length).toBe(1)
			expect(anomalies[0].value).toBe(10.0)
		})
	})

	describe('predictHarvestDate', () => {
		it('should predict harvest date based on crop type', () => {
			const startDate = new Date()
			startDate.setDate(startDate.getDate() - 10)
			const batch = {
				startDate,
				cropType: 'Lettuce',
				status: 'growing',
			}
			const prediction = predictHarvestDate(batch)
			expect(prediction).toBeInstanceOf(Date)
			
			// Lettuce expects ~30 days. So prediction should be startDate + 30 days
			const expected = new Date(startDate)
			expected.setDate(startDate.getDate() + 30)
			expect(prediction.toDateString()).toBe(expected.toDateString())
		})
	})

    describe('calculateHealthScore', () => {
        it('should decrease score based on anomalies', () => {
            const score = calculateHealthScore([1], [1, 2])
            expect(score).toBe(70) // 100 - 10 - 20
        })
    })
})
