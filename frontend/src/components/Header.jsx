import React, { useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/Authcontext'

const Header = () => {
	const { user, logout } = useContext(AuthContext)
	const navigate = useNavigate()

	const onLogout = () => {
		logout()
		navigate('/login')
	}

	return (
		<header className='header'>
			<div className='logo'>
				<Link to='/dashboard'>Hydroponics Manager</Link>
			</div>
			<nav>
				{user ? (
					<>
						<ul className='nav-links'>
							<li>
								<Link to='/dashboard'>Dashboard</Link>
							</li>
							<li>
								<Link to='/expenses'>Transactions</Link>
							</li>
							<li>
								<Link to='/batches'>Batches</Link>
							</li>
						
						</ul><div className='user-info'>
							<span className='hello-name'>Hello, {user.username}</span>
							<button onClick={onLogout} className='btn btn-sm btn-logout'>
								🚪 Logout
							</button>
						</div></> 
				) : (
					// Public View
					<ul className='nav-links'>
						<li>
							<Link to='/login'>Login</Link>
						</li>
						<li>
							<Link to='/register'>Register</Link>
						</li>
					</ul>
				)}
			</nav>
		</header>
	)
}

export default Header
