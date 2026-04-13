import React, { createContext, useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

// 1. Create the Context object
export const AuthContext = createContext()

// 2. Define the Provider Component
export const AuthProvider = ({ children }) => {
	// State to hold the authenticated user object
	const [user, setUser] = useState(null)
	// State for organizations
	const [organizations, setOrganizations] = useState([])
	const [activeOrg, setActiveOrg] = useState(null)
	const [userRole, setUserRole] = useState(null)
	// State to track if the context is still loading data (e.g., from local storage)
	const [isLoading, setIsLoading] = useState(true)
	const navigate = useNavigate()

	// Helper to check if user has any of the required roles
	const hasRole = (roles) => {
		if (!userRole) return false
		if (Array.isArray(roles)) {
			return roles.includes(userRole)
		}
		return userRole === roles
	}

	// Internal helper to update userRole based on activeOrg and organizations list
	const syncUserRole = (orgId, orgsList, currentUserId) => {
		if (!orgId || !orgsList || !currentUserId) {
			setUserRole(null)
			return
		}
		const currentOrg = orgsList.find(org => org._id === orgId)
		if (currentOrg && currentOrg.members) {
			const member = currentOrg.members.find(m => m.user === currentUserId || m.user?._id === currentUserId)
			setUserRole(member ? member.role : null)
		} else {
			setUserRole(null)
		}
	}

	// 3. Load user from local storage on initial load
	useEffect(() => {
		const storedUser = localStorage.getItem('user')
		const storedToken = localStorage.getItem('token')

		if (storedUser && storedToken) {
			// Re-hydrate the state if credentials are found
			try {
				const userData = JSON.parse(storedUser)
				setUser(userData)
				// Optionally set the default Authorization header for all future requests
				axios.defaults.headers.common[
					'Authorization'
				] = `Bearer ${storedToken}`

				const storedOrgId = localStorage.getItem('activeOrgId')
				if (storedOrgId) {
					setActiveOrg(storedOrgId)
					axios.defaults.headers.common['x-tenant-id'] = storedOrgId
				}
				
				fetchOrganizations(userData._id, storedOrgId)
			} catch (error) {
				console.error('Error parsing stored user data:', error)
				// Clear invalid data
				localStorage.clear()
			}
		}
		setIsLoading(false)
	}, [])

	// 4. Login Function
	const login = async (email, password) => {
		setIsLoading(true)
		try {
			// POST to the updated login route
			const res = await axios.post('http://localhost:4000/api/users/login', { email, password })
			const { token, ...userData } = res.data

			// Store credentials
			localStorage.setItem('token', token)
			localStorage.setItem('user', JSON.stringify(userData))

			// Update state and Axios header
			setUser(userData)
			axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

			// Fetch organizations to get role info
			await fetchOrganizations(userData._id)

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
			const { token, ...newUserData } = res.data

			// Log in immediately after registration
			localStorage.setItem('token', token)
			localStorage.setItem('user', JSON.stringify(newUserData))

			setUser(newUserData)
			axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

			await fetchOrganizations(newUserData._id)

			setIsLoading(false)
			return res.data
		} catch (error) {
			setIsLoading(false)
			throw error
		}
	}

	// 6. Fetch Organizations
	const fetchOrganizations = async (userId = user?._id, orgIdToSet = activeOrg) => {
		try {
			const res = await axios.get('http://localhost:4000/api/organizations')
			setOrganizations(res.data)
			
			// If no active org is set, but some exist, pick the first one
			let finalOrgId = orgIdToSet
			if (!finalOrgId && res.data.length > 0) {
				finalOrgId = res.data[0]._id
			}
			
			if (finalOrgId) {
				handleSetActiveOrg(finalOrgId, res.data, userId)
			}
		} catch (error) {
			console.error('Error fetching organizations:', error)
		}
	}

	// 7. Set Active Organization
	const handleSetActiveOrg = (orgId, orgsList = organizations, userId = user?._id) => {
		setActiveOrg(orgId)
		localStorage.setItem('activeOrgId', orgId)
		axios.defaults.headers.common['x-tenant-id'] = orgId
		syncUserRole(orgId, orgsList, userId)
	}

	// 8. Logout Function
	const logout = () => {
		localStorage.clear()
		setUser(null)
		setOrganizations([])
		setActiveOrg(null)
		setUserRole(null)
		delete axios.defaults.headers.common['Authorization']
		delete axios.defaults.headers.common['x-tenant-id']
		navigate('/login') // Redirect on logout
	}

	// 7. Value provided by the context
	const contextValue = {
		user,
		organizations,
		activeOrg,
		userRole,
		isLoading,
		login,
		register,
		logout,
		fetchOrganizations,
		setActiveOrg: handleSetActiveOrg,
		hasRole,
	}

	return (
		<AuthContext.Provider value={contextValue}>
			{children}
		</AuthContext.Provider>
	)
}
