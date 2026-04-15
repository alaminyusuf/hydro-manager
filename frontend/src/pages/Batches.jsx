import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/Authcontext'

const Batches = () => {
    const { activeOrg, user, hasRole } = useContext(AuthContext)
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // 'all', 'mine'

    useEffect(() => {
        // If user is just a member, default to 'mine'. Otherwise 'all'
        if (hasRole && !hasRole(['owner', 'admin', 'manager'])) {
            setFilter('mine');
        } else {
            setFilter('all');
        }
    }, [hasRole]);

    useEffect(() => {
        const fetchBatches = async () => {
            if (!activeOrg) {
                setLoading(false);
                return;
            }
            
            setLoading(true);
            try {
                // Uses the GET /api/batches route
                const res = await axios.get('http://localhost:4000/api/batches'); 
                setBatches(res.data);
                setLoading(false);
                setError(null);
            } catch (err) {
                console.error("Error fetching batches:", err);
                setError("Failed to load crop batches.");
                setLoading(false);
            }
        };
        fetchBatches();
    }, [activeOrg]);
    
    useEffect(() => {
        console.log("Batches page context:", { activeOrg, userId: user?._id });
    }, [activeOrg, user]);

    const filteredBatches = batches.filter(batch => {
        if (filter === 'all') return true;
        if (filter === 'mine') {
            const currentUserId = user?._id?.toString();
            return batch.assignedTo && batch.assignedTo.some(id => {
                const assignedId = (id?._id || id)?.toString();
                return assignedId === currentUserId;
            });
        }
        return true;
    });

    if (!activeOrg)
        return (
            <div className='no-org-state'>
                <h2>No Organization Selected</h2>
                <p>Please select an organization to view grow batches.</p>
                <Link to='/organizations' className='btn'>Manage Organizations</Link>
            </div>
        )
    if (loading) return <div className="loading-state">Loading crop cycles... 🥬</div>;
    if (error) return <div className="error-state">Error: {error}</div>;

    return (
        <div className="batches-page">
            <div className="title-row">
                <h1>Hydroponics Grow Batch Manager</h1>
                <div className="filter-tabs">
                    <button 
                        className={`tab-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All Batches
                    </button>
                    <button 
                        className={`tab-btn ${filter === 'mine' ? 'active' : ''}`}
                        onClick={() => setFilter('mine')}
                    >
                        My Assignments
                    </button>
                </div>
            </div>
            
            <div className="utility-bar">
                {hasRole(['owner', 'admin', 'manager']) && (
                    <Link to="/new-batch" className="btn btn-primary">+ Start New Batch</Link> 
                )}
            </div>

            {filteredBatches.length === 0 ? (
                <p className='no-data-message'>
                    {filter === 'mine' 
                        ? "You haven't been assigned to any grow cycles yet." 
                        : "No grow cycles found for your organization."}
                </p>
            ) : (
                <div className="batch-grid">
                    {filteredBatches.map(batch => (
                        <div key={batch._id} className={`batch-card status-${batch.status}`}>
                            <div className="batch-header">
                                <h2>{batch.name}</h2>
                                <span className={`status-badge ${batch.status}`}>{batch.status}</span>
                            </div>
                            <p className='crop-type'>Crop: <strong>{batch.cropType}</strong></p>
                            <div className="batch-dates">
                                <p>Start: {new Date(batch.startDate).toLocaleDateString()}</p>
                                {batch.harvestDate && (
                                    <p>Harvest: {new Date(batch.harvestDate).toLocaleDateString()}</p>
                                )}
                            </div>
                            
                            {batch.assignedTo && batch.assignedTo.length > 0 && (
                                <div className="assigned-users">
                                    <p>Assigned: {batch.assignedTo.length} members</p>
                                </div>
                            )}

                            <div className='card-actions'>
                                <Link to={`/batches/${batch._id}`} className='btn btn-sm btn-secondary'>
                                    View Details & Logs
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Batches;