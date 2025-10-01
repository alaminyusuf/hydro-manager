import React, { useState, useContext, useEffect } from 'react'
import { AuthContext } from '../context/Authcontext'
import { Link, useNavigate } from 'react-router-dom'

const Login = () => {
	const [formData, setFormData] = useState({ Email: '', Password: '' })
	const [error, setError] = useState(null)
	const { login, user, isLoading } = useContext(AuthContext)
	const navigate = useNavigate()

	// Redirect if already logged in
	useEffect(() => {
		if (user) {
			navigate('/dashboard')
		}
	}, [user, navigate])

	const onChange = (e) => {
		setFormData({ ...formData, [e.target.name]: e.target.value })
	}

	const onSubmit = async (e) => {
		e.preventDefault()
		setError(null)

		try {
			await login(formData.Email, formData.Password)
			// Login successful, useEffect handles navigation
		} catch (err) {
			// Display error message from the backend controller
			setError(
				err.response?.data?.message ||
					'Login failed. Check your credentials.'
			)
		}
	}

	if (isLoading)
		return <div className='loading-state'>Authenticating...</div>

	return (
		<div className='auth-container'>
			<div className='auth-card'>
				<h2>Login to Hydro-MERN 🚀</h2>
				<form onSubmit={onSubmit}>
					{error && <p className='error-message'>{error}</p>}

					<div className='form-group'>
						<label htmlFor='Email'>Email</label>
						<input
							type='email'
							id='Email'
							name='Email'
							value={formData.Email}
							onChange={onChange}
							required
						/>
					</div>

					<div className='form-group'>
						<label htmlFor='Password'>Password</label>
						<input
							type='password'
							id='Password'
							name='Password'
							value={formData.Password}
							onChange={onChange}
							required
						/>
					</div>

					<button type='submit' className='btn btn-primary'>
						Login
					</button>
				</form>
				<p className='auth-footer'>
					Don't have an account? <Link to='/register'>Sign Up</Link>
				</p>
			</div>
		</div>
	)
}

export default Login
