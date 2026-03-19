import React, { useState, useContext } from 'react'
import axios from 'axios'
import { AuthContext } from '../context/Authcontext'

const Organizations = () => {
	const { organizations, fetchOrganizations, setActiveOrg, activeOrg } = useContext(AuthContext)
	const [name, setName] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)

	const onCreateOrg = async (e) => {
		e.preventDefault()
		if (!name) return

		setLoading(true)
		try {
			await axios.post('http://localhost:4000/api/organizations', { name })
			setName('')
			await fetchOrganizations()
			setLoading(false)
		} catch (err) {
			setError('Failed to create organization')
			setLoading(false)
		}
	}

	return (
		<div className='organizations-page'>
			<h2>Manage Organizations</h2>
			
			<div className='create-org-section'>
				<h3>Create New Organization</h3>
				<form onSubmit={onCreateOrg}>
					<div className='form-group'>
						<input 
							type='text' 
							placeholder='Organization Name' 
							value={name} 
							onChange={(e) => setName(e.target.value)}
							required
						/>
					</div>
					<button type='submit' className='btn' disabled={loading}>
						{loading ? 'Creating...' : 'Create Organization'}
					</button>
				</form>
				{error && <p className='error-text'>{error}</p>}
			</div>

			<hr />

			<div className='org-list-section'>
				<h3>Your Organizations</h3>
				{organizations.length === 0 ? (
					<p>You don't belong to any organizations yet.</p>
				) : (
					<ul className='org-list'>
						{organizations.map(org => (
							<li key={org._id} className={`org-item ${activeOrg === org._id ? 'active' : ''}`}>
								<div className='org-info'>
									<h4>{org.name}</h4>
									<p>Role: {org.members.find(m => m.user === org.owner) ? 'Owner' : 'Member'}</p>
								</div>
								<div className='org-actions'>
									{activeOrg !== org._id && (
										<button 
											onClick={() => setActiveOrg(org._id)} 
											className='btn btn-sm'
										>
											Switch To
										</button>
									)}
									{activeOrg === org._id && <span className='active-badge'>Active</span>}
								</div>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	)
}

export default Organizations
