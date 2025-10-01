import React, { useState, useEffect, useContext, useRef } from 'react'
import axios from 'axios'
import { AuthContext } from '../context/Authcontext'
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2'
import { Link } from 'react-router-dom'

const Dashboard = () => {
	const { user } = useContext(AuthContext)
	const [summary, setSummary] = useState(null)
	const [batches, setBatches] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)

	
	useEffect(() => {
		const fetchData = async () => {
			setLoading(true)
			const token = localStorage.getItem('token')
			if (!token) {
				setError('Please log in to view the dashboard.')
				setLoading(false)
				return
			}

			const config = { headers: { Authorization: `Bearer ${token}` } }

			try {
				// Fetch Financial Summary
				const summaryRes = await axios.get('http://localhost:4000/api/expenses/summary', config)
				setSummary(summaryRes.data)

				// Fetch Crop Batches
				const batchesRes = await axios.get('http://localhost:4000/api/batches', config)
				// Filter to show only active (not yet harvested) batches for the MVP
				const activeBatches = batchesRes.data.filter((b) => !b.harvestDate)
				setBatches(activeBatches)

				setLoading(false)
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
	}, [])
	
	if (loading)
	return <div className='loading-state'>Loading dashboard... 🌿</div>
	if (error) return <div className='error-state'>Error: {error}</div>
	
	const financial = summary?.financialSummary
	const expenseData = summary?.expensesByCategory

	return (
		<div className='dashboard-page'>
			<h2>Welcome Back, {user.full_Name.split(' ')[0]}</h2>

			<div className='card-container financial-cards'>
				{/* <div className='card balance-card'>
					<h3>Current Balance</h3>
					<h1>{financial.balance.toFixed(2)}</h1>
				</div> */}
				<div className='card income-card'>
					<h3>Total Income</h3>
					<p>{financial.totalIncome.toFixed(2)}</p>
				</div>
				<div className='card expense-card'>
					<h3>Total Expenses</h3>
					<p>{financial.totalExpenses.toFixed(2)}</p>
				</div>
			</div>

			<hr />

			<div className='dashboard-grid'>
				<div className='chart-section'>
					<h3>Expense Breakdown by Category</h3>
					{expenseData && expenseData.length > 0 ? (
						<></>
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
									<h4>{batch.name}</h4>
									<p>Crop: {batch.cropType}</p>
									<p>
										Started:{' '}
										{new Date(batch.startDate).toLocaleDateString()}
									</p>
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
