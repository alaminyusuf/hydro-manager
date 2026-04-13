import React, { useState, useContext, useEffect } from 'react'
import axios from 'axios'
import { AuthContext } from '../context/Authcontext'

const Organizations = () => {
	const { 
		organizations, 
		fetchOrganizations, 
		setActiveOrg, 
		activeOrg, 
		user, 
		userRole, 
		hasRole 
	} = useContext(AuthContext)
	
	const [name, setName] = useState('')
	const [memberEmail, setMemberEmail] = useState('')
	const [memberRole, setMemberRole] = useState('member')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)
	const [currentOrgData, setCurrentOrgData] = useState(null)

	useEffect(() => {
		if (activeOrg && organizations) {
			const org = organizations.find(o => o._id === activeOrg)
			setCurrentOrgData(org)
		}
	}, [activeOrg, organizations])

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

	const onAddMember = async (e) => {
		e.preventDefault()
		if (!memberEmail) return

		setLoading(true)
		try {
			await axios.post(`http://localhost:4000/api/organizations/${activeOrg}/members`, { 
				email: memberEmail, 
				role: memberRole 
			})
			setMemberEmail('')
			await fetchOrganizations()
			setLoading(false)
		} catch (err) {
			setError(err.response?.data?.message || 'Failed to add member')
			setLoading(false)
		}
	}

	const onRemoveMember = async (memberId) => {
		if (!window.confirm('Are you sure you want to remove this member?')) return

		setLoading(true)
		try {
			await axios.delete(`http://localhost:4000/api/organizations/${activeOrg}/members/${memberId}`)
			await fetchOrganizations()
			setLoading(false)
		} catch (err) {
			setError(err.response?.data?.message || 'Failed to remove member')
			setLoading(false)
		}
	}

	const onUpdateRole = async (memberId, newRole) => {
		setLoading(true)
		try {
			await axios.put(`http://localhost:4000/api/organizations/${activeOrg}/members/${memberId}/role`, { 
				role: newRole 
			})
			await fetchOrganizations()
			setLoading(false)
		} catch (err) {
			setError(err.response?.data?.message || 'Failed to update role')
			setLoading(false)
		}
	}

	return (
		<div className='organizations-page'>
			<h2>Organization Management</h2>
			
			<div className='dashboard-grid'>
				<div className='org-section'>
					<div className='create-org-section card'>
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
					</div>

					<div className='org-list-section card'>
						<h3>Your Organizations</h3>
						{organizations.length === 0 ? (
							<p>You don't belong to any organizations yet.</p>
						) : (
							<ul className='org-list'>
								{organizations.map(org => {
									const myMember = org.members.find(m => 
										(m.user === user._id || m.user?._id === user._id)
									);
									return (
										<li key={org._id} className={`org-item ${activeOrg === org._id ? 'active' : ''}`}>
											<div className='org-info'>
												<h4>{org.name}</h4>
												<span className={`role-badge ${myMember?.role}`}>
													{myMember?.role || 'member'}
												</span>
											</div>
											<div className='org-actions'>
												{activeOrg !== org._id && (
													<button 
														onClick={() => setActiveOrg(org._id)} 
														className='btn btn-sm btn-secondary'
													>
														Switch
													</button>
												)}
												{activeOrg === org._id && <span className='active-badge'>Active</span>}
											</div>
										</li>
									);
								})}
							</ul>
						)}
					</div>
				</div>

				<div className='member-section'>
					{activeOrg && currentOrgData && (
						<div className='card'>
							<h3>Members of {currentOrgData.name}</h3>
							
							{hasRole(['owner', 'admin']) && (
								<div className='add-member-form'>
									<h4>Add New Member</h4>
									<form onSubmit={onAddMember} className='inline-form'>
										<input 
											type='email' 
											placeholder='User Email' 
											value={memberEmail}
											onChange={(e) => setMemberEmail(e.target.value)}
											required
										/>
										<select 
											value={memberRole} 
											onChange={(e) => setMemberRole(e.target.value)}
										>
											<option value="member">Member</option>
											<option value="manager">Manager</option>
											<option value="admin">Admin</option>
										</select>
										<button type='submit' className='btn btn-sm' disabled={loading}>
											Add
										</button>
									</form>
								</div>
							)}

							<div className='member-list'>
								<table className='member-table'>
									<thead>
										<tr>
											<th>User</th>
											<th>Role</th>
											{hasRole(['owner', 'admin']) && <th>Actions</th>}
										</tr>
									</thead>
									<tbody>
										{currentOrgData.members.map(member => {
											const mUserId = member.user?._id || member.user;
											return (
												<tr key={mUserId}>
													<td>
														<div className="member-info">
															<strong>{member.username || 'N/A'}</strong>
															<div>{member.email}</div>
														</div>
													</td>
													<td>
														{hasRole(['owner', 'admin']) && member.role !== 'owner' && mUserId !== user._id ? (
															<select 
																value={member.role}
																onChange={(e) => onUpdateRole(mUserId, e.target.value)}
																className='role-select-sm'
															>
																<option value="member">Member</option>
																<option value="manager">Manager</option>
																<option value="admin">Admin</option>
															</select>
														) : (
															<span className={`role-badge ${member.role}`}>{member.role}</span>
														)}
													</td>
													{hasRole(['owner', 'admin']) && (
														<td>
															{member.role !== 'owner' && mUserId !== user._id && (
																<button 
																	onClick={() => onRemoveMember(mUserId)}
																	className='btn btn-danger btn-sm'
																	title='Remove Member'
																>
																	Remove
																</button>
															)}
														</td>
													)}
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>
					)}
					{!activeOrg && <div className='card'><p>Select an organization to manage members.</p></div>}
				</div>
			</div>
			{error && <p className='error-text'>{error}</p>}
		</div>
	)
}

export default Organizations
