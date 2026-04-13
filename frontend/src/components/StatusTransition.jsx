import React, { useState } from 'react';
import axios from 'axios';

const VALID_TRANSITIONS = {
    planning: ['seeding'],
    seeding: ['growing', 'planning'],
    growing: ['harvesting', 'seeding'],
    harvesting: ['completed', 'growing'],
    completed: ['archived'],
    archived: []
};

const StatusTransition = ({ batchId, currentStatus, onUpdate, hasPermission }) => {
    const [loading, setLoading] = useState(false);
    const nextStatuses = VALID_TRANSITIONS[currentStatus] || [];

    const handleTransition = async (status) => {
        setLoading(true);
        try {
            await axios.put(`http://localhost:4000/api/batches/${batchId}/status`, { status });
            onUpdate();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update status');
        } finally {
            setLoading(false);
        }
    };

    if (!hasPermission || nextStatuses.length === 0) return null;

    return (
        <div className="status-actions">
            <h4>Update Status</h4>
            <div className="btn-group">
                {nextStatuses.map(status => (
                    <button 
                        key={status} 
                        onClick={() => handleTransition(status)}
                        className={`btn btn-sm status-btn-${status}`}
                        disabled={loading}
                    >
                        Move to {status}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default StatusTransition;
