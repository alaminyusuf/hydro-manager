import React from 'react'
import { useNavigate } from 'react-router-dom'
import ExpenseForm from '../components/ExpenseForm' 

const NewExpense = () => {
	const navigate = useNavigate()

	const handleSuccess = () => {
		alert('Transaction successfully logged!')
		navigate('/expenses') 
	}

	return (
		<div className='new-expense-page'>
			<h1>Log a New Financial Transaction</h1>
			<ExpenseForm onSuccess={handleSuccess} />
		</div>
	)
}

export default NewExpense
