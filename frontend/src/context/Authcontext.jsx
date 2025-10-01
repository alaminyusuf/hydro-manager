import React, { createContext, useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

// 1. Create the Context object
export const AuthContext = createContext()

// 2. Define the Provider Component
export const AuthProvider = ({ children }) => {
	// State to hold the authenticated user object
	const [user, setUser] = useState(null)
	// State to track if the context is still loading data (e.g., from local storage)
	const [isLoading, setIsLoading] = useState(true)
	const navigate = useNavigate()

	// 3. Load user from local storage on initial load
	useEffect(() => {
		const storedUser = localStorage.getItem('user')
		const storedToken = localStorage.getItem('token')

		if (storedUser && storedToken) {
			// Re-hydrate the state if credentials are found
			try {
				setUser(JSON.parse(storedUser))
				// Optionally set the default Authorization header for all future requests
				axios.defaults.headers.common[
					'Authorization'
				] = `Bearer ${storedToken}`
			} catch (error) {
				console.error('Error parsing stored user data:', error)
				// Clear invalid data
				localStorage.clear()
			}
		}
		setIsLoading(false)
	}, [])

	// 4. Login Function
	const login = async (Email, Password) => {
		setIsLoading(true)
		try {
			// POST to the updated login route
			const res = await axios.post('http://localhost:4000/api/users/login', { Email, Password })
			const { token, ...userData } = res.data

			// Store credentials
			localStorage.setItem('token', token)
			localStorage.setItem('user', JSON.stringify(userData))

			// Update state and Axios header
			setUser(userData)
			axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

			setIsLoading(false)
			return res.data // Return data on success
		} catch (error) {
			setIsLoading(false)
			throw error // Let the calling component handle the error message
		}
	}

	// 5. Register Function
	const register = async (userData) => {
		setIsLoading(true)
		try {
			// POST to the updated registration route
			const res = await axios.post('http://localhost:4000/api/users', userData)
			console.log(res);
			const { token, ...newUserData } = res.data

			// Log in immediately after registration
			localStorage.setItem('token', token)
			localStorage.setItem('user', JSON.stringify(newUserData))

			setUser(newUserData)
			axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

			setIsLoading(false)
			return res.data
		} catch (error) {
			setIsLoading(false)
			throw error
		}
	}

	// 6. Logout Function
	const logout = () => {
		localStorage.clear()
		setUser(null)
		delete axios.defaults.headers.common['Authorization']
		navigate('/login') // Redirect on logout
	}

	// 7. Value provided by the context
	const contextValue = {
		user,
		isLoading,
		login,
		register,
		logout,
	}

	return (
		<AuthContext.Provider value={contextValue}>
			{children}
		</AuthContext.Provider>
	)
}
