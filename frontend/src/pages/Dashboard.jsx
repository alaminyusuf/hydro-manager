import React, { useState, useEffect, useContext, useRef } from 'react'
import axios from 'axios'
import { AuthContext } from '../context/Authcontext'
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2'
import { Link } from 'react-router-dom'

// Register Chart.js components
Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboard = () => {
	const { user, activeOrg } = useContext(AuthContext)
	const [summary, setSummary] = useState(null)
	const [batches, setBatches] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)

	
	useEffect(() => {
		const fetchData = async () => {
			if (!activeOrg) {
				setLoading(false)
				return
			}
			
			setLoading(true)
			try {
				// Fetch Financial Summary
				const summaryRes = await axios.get('http://localhost:4000/api/expenses/summary')
				setSummary(summaryRes.data)

				// Fetch Crop Batches
				const batchesRes = await axios.get('http://localhost:4000/api/batches')
				// Filter to show only active (not yet harvested) batches for the MVP
				const activeBatches = batchesRes.data.filter((b) => !b.harvestDate)
				
                // Fetch Insights for each active batch
                const batchesWithInsights = await Promise.all(activeBatches.map(async (batch) => {
                    try {
                        const insightRes = await axios.get(`http://localhost:4000/api/batches/${batch._id}/insights`)
                        return { ...batch, insights: insightRes.data.insights }
                    } catch (err) {
                        console.error(`Error fetching insights for ${batch.name}:`, err)
                        return batch
                    }
                }))

				setBatches(batchesWithInsights)

				setLoading(false)
				setError(null)
			} catch (err) {
				console.error(
					'Dashboard data fetch error:',
					err.response?.data?.message || err.message
				)
				setError('Failed to load dashboard data.')
				setLoading(false)
			}
		}
	
		fetchData()
	}, [activeOrg])
	
	if (!activeOrg)
		return (
			<div className='no-org-state'>
				<h2>No Organization Selected</h2>
				<p>Please select or create an organization to get started.</p>
				<Link to='/organizations' className='btn'>Manage Organizations</Link>
			</div>
		)
	if (loading)
		return <div className='loading-state'>Loading dashboard... 🌿</div>
	if (error) return <div className='error-state'>Error: {error}</div>
	
	const financial = summary?.financialSummary
	const expenseData = summary?.expensesByCategory

    // Calculate overall system health
    const systemHealth = batches.length > 0 
        ? Math.round(batches.reduce((acc, b) => acc + (b.insights?.healthScore || 100), 0) / batches.length)
        : 100

    // Prepare Chart Data
    const chartData = {
        labels: expenseData.map(item => item._id || 'Unknown'),
        datasets: [
            {
                label: 'Expenses by Category ($)',
                data: expenseData.map(item => item.total),
                backgroundColor: [
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                    'rgba(255, 159, 64, 0.6)',
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(255, 205, 86, 0.6)',
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 205, 86, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'bottom',
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value) => `$${value}`,
                },
            },
        },
    };

	return (
		<div className='dashboard-page'>
			<div className='dashboard-header'>
                <h2>Welcome Back, {user.full_Name.split(' ')[0]}</h2>
                <div className={`health-badge health-${systemHealth > 80 ? 'good' : systemHealth > 50 ? 'warning' : 'critical'}`}>
                    System Health: {systemHealth}%
                </div>
            </div>

			<div className='card-container financial-cards'>
				<div className='card income-card'>
					<h3>Total Income</h3>
					<p>${financial.totalIncome.toFixed(2)}</p>
				</div>
				<div className='card expense-card'>
					<h3>Total Expenses</h3>
					<p>${financial.totalExpenses.toFixed(2)}</p>
				</div>
                <div className='card health-card'>
                    <h3>Active Batches</h3>
                    <p>{batches.length}</p>
                </div>
			</div>

			<hr />

			<div className='dashboard-grid'>
				<div className='chart-section'>
					<h3>Expense Breakdown by Category</h3>
					{expenseData && expenseData.length > 0 ? (
						<div className='chart-container'>
                            <Bar data={chartData} options={chartOptions} />
                        </div>
					) : (
						<p>
							No expense data to display yet.{' '}
							<Link to='/new-expense'>Log your first expense!</Link>
						</p>
					)}
				</div>

				<div className='batches-section'>
					<h3>Active Grow Batches ({batches.length})</h3>
					{batches.length > 0 ? (
						<ul className='batch-list'>
							{batches.map((batch) => (
								<li key={batch._id} className='batch-item'>
									<div className='batch-info'>
                                        <h4>{batch.name}</h4>
                                        <p>Crop: {batch.cropType}</p>
                                        <p>
                                            Started:{' '}
                                            {new Date(batch.startDate).toLocaleDateString()}
                                        </p>
                                        {batch.insights?.predictedHarvest && (
                                            <p className='prediction'>
                                                Est. Harvest: {new Date(batch.insights.predictedHarvest).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                    <div className='batch-insights'>
                                        {batch.insights?.phAnomalies?.length > 0 && (
                                            <span className='alert-badge ph-alert' title='pH Anomaly Detected'>pH ⚠️</span>
                                        )}
                                        {batch.insights?.ecAnomalies?.length > 0 && (
                                            <span className='alert-badge ec-alert' title='EC Anomaly Detected'>EC ⚠️</span>
                                        )}
                                        <div className='health-score-mini'>
                                            Health: {batch.insights?.healthScore || 100}%
                                        </div>
                                    </div>
									<Link
										to={`/batches/${batch._id}`}
										className='btn btn-sm btn-view'
									>
										View Logs
									</Link>
								</li>
							))}
						</ul>
					) : (
						<p>
							No active batches found.{' '}
							<Link to='/new-batch'>Start a new grow cycle!</Link>
						</p>
					)}
				</div>
			</div>
		</div>
	)
}

export default Dashboard
