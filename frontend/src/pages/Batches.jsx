import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Batches = () => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBatches = async () => {
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                setError("Authorization failed. Please log in.");
                setLoading(false);
                return;
            }

            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            try {
                // Uses the GET /api/batches route
                const res = await axios.get('http://localhost:4000/api/batches', config); 
                setBatches(res.data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching batches:", err);
                setError("Failed to load crop batches.");
                setLoading(false);
            }
        };
        fetchBatches();
    }, []);
    
    // Simple function to determine if a batch is active or completed
    const getBatchStatus = (batch) => {
        if (batch.harvestDate) {
            return { text: 'Harvested', class: 'status-harvested' };
        }
        const today = new Date();
        const start = new Date(batch.startDate);
        const daysActive = Math.ceil((today - start) / (1000 * 60 * 60 * 24));
        return { text: `Active (${daysActive} days)`, class: 'status-active' };
    };

    if (loading) return <div className="loading-state">Loading crop cycles... 🥬</div>;
    if (error) return <div className="error-state">Error: {error}</div>;

    return (
        <div className="batches-page">
            <h1>Hydroponics Grow Batch Manager</h1>
            
            <div className="utility-bar">
                {/* This link will take the user to a page to start a new batch */}
                <Link to="/new-batch" className="btn btn-primary">+ Start New Batch</Link> 
            </div>

            {batches.length === 0 ? (
                <p className='no-data-message'>You haven't started any grow cycles yet. Click 'Start New Batch' to begin tracking!</p>
            ) : (
                <div className="batch-grid">
                    {batches.map(batch => {
                        const status = getBatchStatus(batch);
                        return (
                            <div key={batch._id} className={`batch-card ${status.class}`}>
                                <h2>{batch.name}</h2>
                                <p className='crop-type'>Crop: <strong>{batch.cropType}</strong></p>
                                <p>Start Date: {new Date(batch.startDate).toLocaleDateString()}</p>
                                <p>Harvest Date: {batch.harvestDate ? new Date(batch.harvestDate).toLocaleDateString() : 'N/A'}</p>
                                <div className={`batch-status ${status.class}`}>
                                    {status.text}
                                </div>
                                <div className='card-actions'>
                                    {/* Future feature: Link to a detailed Batch view page */}
                                    <Link to={`/batches/${batch._id}`} className='btn btn-sm btn-secondary'>
                                        View Details & Logs
                                    </Link>
                                    {/* Future feature: Button to mark as harvested/completed */}
                                    {!batch.harvestDate && (
                                        <button className='btn btn-sm btn-success-outline'>Harvest</button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Batches;