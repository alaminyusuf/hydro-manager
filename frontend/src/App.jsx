import React from 'react'
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
} from 'react-router-dom'
import './App.css'
// Import Auth Context
import { AuthProvider, AuthContext } from './context/Authcontext'
// Import Header Component
import Header from './components/Header'
// Import pages
import Dashboard from './pages/Dashboard'
import Login from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import NewExpense from './pages/NewExpense'
// Future pages you will need:
import TransactionsList from './pages/Expenses';
import BatchManager from './pages/Batches';
import NewBatch from './pages/NewBatch';
import BatchDetails from './pages/BatchDetail';
import Organizations from './pages/Organizations';
import SimulationPanel from './pages/SimulationPanel';

// Custom component to handle guest-only routes (redirects to dashboard if logged in)
const PublicRoute = ({ children }) => {
	const { user, isLoading } = React.useContext(AuthContext)

	if (isLoading) {
		return <div className='loading-app'>Loading application...</div>
	}

	return user ? <Navigate to='/dashboard' /> : children
}

// Custom component to handle protected routes
const PrivateRoute = ({ children }) => {
	const { user, isLoading } = React.useContext(AuthContext)

	if (isLoading) {
		// Show a loading indicator while checking auth status
		return <div className='loading-app'>Loading application...</div>
	}

	// If user is not logged in, redirect them to the login page
	return user ? children : <Navigate to='/login' />
}

function App() {
	return (
		// 1. Setup Router for client-side navigation
		<Router>
			{/* 2. Wrap the entire app in AuthProvider to give all components access to user state */}
			<AuthProvider>
				<div className='app-container'>
					<Header />
					<main className='content-area'>
						{/* 3. Define the application routes */}
						<Routes>
							{/* Public Routes restricted for guests only */}
							<Route path='/login' element={<PublicRoute><Login /></PublicRoute>} />
							<Route path='/register' element={<PublicRoute><SignupPage /></PublicRoute>} />
							<Route path="/simulation" element={<PublicRoute><SimulationPanel /></PublicRoute>} />

							{/* Redirect root path to Dashboard */}
							<Route path='/' element={<Navigate to='/dashboard' />} />

							{/* Private (Protected) Routes */}
							<Route
								path='/dashboard'
								element={
									<PrivateRoute>
										<Dashboard />
									</PrivateRoute>
								}
							/>
							<Route
								path='/new-expense'
								element={
									<PrivateRoute>
										<NewExpense />
									</PrivateRoute>
								}
							/>
							<Route path="/expenses" element={
									<PrivateRoute>
											<TransactionsList />
									</PrivateRoute>
									} />
									<Route path="/batches" element={
											<PrivateRoute>
													<BatchManager />
											</PrivateRoute>
									} />
									<Route path="/new-batch" element={
											<PrivateRoute>
													<NewBatch />
											</PrivateRoute>
									} />

							<Route path="/batches/:id" element={ 
									<PrivateRoute>
											<BatchDetails />
									</PrivateRoute>
} />
							<Route path="/organizations" element={ 
									<PrivateRoute>
											<Organizations />
									</PrivateRoute>
} />
                           

							{/* 404 Catch-all Route */}
							<Route
								path='*'
								element={
									<div className='error-page'>
										<h2>404 - Page Not Found</h2>
										<p>The path you requested does not exist.</p>
									</div>
								}
							/>
						</Routes>
					</main>
				</div>
			</AuthProvider>
		</Router>
	)
}

export default App
