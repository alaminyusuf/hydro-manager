import React, { useState, useContext, useEffect } from 'react'
import { AuthContext } from '../context/Authcontext'
import { Link, useNavigate } from 'react-router-dom'

const SignupPage = () => {
	const [formData, setFormData] = useState({
		full_Name: '',
		username: '',
		email: '',
		password: '',
	})
	const [error, setError] = useState(null)
	const { register, user } = useContext(AuthContext)
	const navigate = useNavigate()

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

		if (formData.password.length < 6) {
			setError('Password must be at least 6 characters long.')
			return
		}

		try {
			await register(formData)
		} catch (err) {
			setError(
				err.response?.data?.message ||
					'Registration failed. Please try again.'
			)
		}
	}

	return (
		<div className='auth-container'>
			<div className='auth-card'>
				<h2>Create Your Hydro-MERN Account 🌱</h2>
				<form onSubmit={onSubmit}>
					{error && <p className='error-message'>{error}</p>}

					<div className='form-group'>
						<label htmlFor='full_Name'>Full Name</label>
						<input
							type='text'
							id='Full_Name'
							name='full_Name'
							value={formData.full_Name}
							onChange={onChange}
							required
						/>
					</div>

					<div className='form-group'>
						<label htmlFor='username'>Username</label>
						<input
							type='text'
							id='Username'
							name='username'
							value={formData.username}
							onChange={onChange}
							required
						/>
					</div>

					<div className='form-group'>
						<label htmlFor='email'>Email</label>
						<input
							type='email'
							id='Email'
							name='email'
							value={formData.email}
							onChange={onChange}
							required
						/>
					</div>

					<div className='form-group'>
						<label htmlFor='password'>Password</label>
						<input
							type='password'
							id='Password'
							name='password'
							value={formData.password}
							onChange={onChange}
							required
						/>
					</div>

					<button type='submit' className='btn btn-primary'>
						Register
					</button>
				</form>
				<p className='auth-footer'>
					Already have an account? <Link to='/login'>Login</Link>
				</p>
			</div>
		</div>
	)
}

export default SignupPage
