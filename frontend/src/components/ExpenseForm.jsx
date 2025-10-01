import React, { useState, useEffect } from 'react'
import axios from 'axios'

// Define standard categories for the MVP
const EXPENSE_CATEGORIES = [
	'Electricity',
	'Nutrients',
	'Water',
	'Seeds/Seedlings',
	'Labor',
	'Maintenance',
	'Other Expense',
]
const INCOME_CATEGORIES = ['Sales', 'Other Income']

// Component accepts a prop to notify parent of a successful submission
const ExpenseForm = ({ onSuccess }) => {
	const [formData, setFormData] = useState({
		amount: '',
		isIncome: false,
		category: EXPENSE_CATEGORIES[0],
		description: '',
		batch: '', // batch ID
	})
	const [activeBatches, setActiveBatches] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)

	// Fetch active crop batches when the component loads
	useEffect(() => {
		const fetchBatches = async () => {
			const token = localStorage.getItem('token')
			if (!token) {
				setError('Please log in to add transactions.')
				setLoading(false)
				return
			}
			try {
				const config = { headers: { Authorization: `Bearer ${token}` } }
				// Using the GET /api/batches route
				const res = await axios.get('http://localhost:4000/api/batches', config)
				setActiveBatches(res.data)
				setLoading(false)
			} catch (err) {
				console.error('Error fetching batches:', err)
				setError('Failed to load crop batches.')
				setLoading(false)
			}
		}
		fetchBatches()
	}, [])

	const onChange = (e) => {
		const value =
			e.target.name === 'isIncome'
				? e.target.value === 'true' // Convert string 'true'/'false' to boolean
				: e.target.value

		setFormData({
			...formData,
			[e.target.name]: value,
		})

		// If transaction type changes, reset category selection
		if (e.target.name === 'isIncome') {
			setFormData((prev) => ({
				...prev,
				category:
					value === 'true' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0],
			}))
		}
	}

	const onSubmit = async (e) => {
		e.preventDefault()
		setError(null)
		const token = localStorage.getItem('token')

		try {
			const config = { headers: { Authorization: `Bearer ${token}` } }

			// Adjust payload for the backend - amount must be a number
			const payload = {
				...formData,
				amount: parseFloat(formData.amount),
				isIncome: formData.isIncome,
			}

			// Using the POST /api/expenses route
			await axios.post('http://localhost:4000/api/expenses', payload, config)

			// Success handler: reset form and call parent function
			setFormData({
				amount: '',
				isIncome: false,
				category: EXPENSE_CATEGORIES[0],
				description: '',
				batch: '',
			})
			onSuccess()
		} catch (err) {
			const msg =
				err.response?.data?.message || 'Transaction failed to save.'
			setError(msg)
		}
	}

	const currentCategories = formData.isIncome
		? INCOME_CATEGORIES
		: EXPENSE_CATEGORIES

	return (
		<div className='form-container'>
			<h3>Log New Transaction 💸</h3>
			<form onSubmit={onSubmit} className='expense-form'>
				{error && <p className='error-message'>{error}</p>}

				<div className='form-group'>
					<label>Type</label>
					<select
						name='isIncome'
						value={formData.isIncome}
						onChange={onChange}
						required
					>
						<option value={false}>Expense</option>
						<option value={true}>Income (Sales)</option>
					</select>
				</div>

				<div className='form-group'>
					<label htmlFor='amount'>Amount ($)</label>
					<input
						type='number'
						id='amount'
						name='amount'
						value={formData.amount}
						onChange={onChange}
						placeholder='e.g., 25.50'
						min='0.01'
						step='0.01'
						required
					/>
				</div>

				<div className='form-group'>
					<label>Category</label>
					<select
						name='category'
						value={formData.category}
						onChange={onChange}
						required
					>
						{currentCategories.map((cat) => (
							<option key={cat} value={cat}>
								{cat}
							</option>
						))}
					</select>
				</div>

				<div className='form-group'>
					<label>Link to Crop Batch (Optional)</label>
					{loading ? (
						<select disabled>
							<option>Loading batches...</option>
						</select>
					) : (
						<select
							name='batch'
							value={formData.batch}
							onChange={onChange}
						>
							<option value=''>-- General / Unlinked --</option>
							{activeBatches.map((batch) => (
								<option key={batch._id} value={batch._id}>
									{batch.name} ({batch.cropType})
								</option>
							))}
						</select>
					)}
				</div>

				<div className='form-group'>
					<label htmlFor='description'>Description</label>
					<input
						type='text'
						id='description'
						name='description'
						value={formData.description}
						onChange={onChange}
						maxLength='100'
						placeholder='e.g., Monthly electricity bill'
					/>
				</div>

				<button type='submit' className='btn btn-primary'>
					{formData.isIncome ? 'Log Income' : 'Log Expense'}
				</button>
			</form>
		</div>
	)
}

export default ExpenseForm
