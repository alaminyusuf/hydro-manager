import { useState } from "react";
import axios from 'axios';

const AssignmentManager = ({ batchId, currentAssignments, orgMembers, onUpdate, hasPermission }) => {
    const [loading, setLoading] = useState(false);
    
    const handleAssign = async (userIds) => {
        setLoading(true);
        try {
            await axios.put(`http://localhost:4000/api/batches/${batchId}/assign`, { userIds });
            onUpdate();
        } catch (err) {
            console.error(err)
            alert(err.response?.data?.message || 'Failed to update assignments');
        } finally {
            setLoading(false);
        }
    };

    const toggleUser = (userId) => {
        const isCurrentlyAssigned = currentAssignments.filter(Boolean).some(a => (a._id || a) === userId);
        let newIds;
        if (isCurrentlyAssigned) {
            newIds = currentAssignments.filter(Boolean).filter(a => (a._id || a) !== userId).map(a => a._id || a);
        } else {
            newIds = [...currentAssignments.filter(Boolean).map(a => a._id || a), userId];
        }
        handleAssign(newIds);
    };

    // Filter out owner and already assigned members for the check-list
    const availableMembers = orgMembers.filter(m => {
        const userId = m.user?._id || m.user;
        const isOwner = m.role === 'owner';
        const isAssigned = currentAssignments.filter(Boolean).some(a => (a._id || a) === userId);
        return !isOwner && !isAssigned;
    });

    return (
        <div className="assignment-manager">
            <h4>Assigned Members</h4>
            <div className="assigned-list">
                {currentAssignments.length === 0 ? <p>No one assigned.</p> : (
                    <ul className="assigned-user-list">
                        {currentAssignments.filter(Boolean).map(a => (
                            <li key={a._id || a} className="assigned-member-item">
                                <span>{a.full_Name || a.username || a.email || 'User'}</span>
                                {hasPermission && (
                                    <button 
                                        className="btn-remove-assign"
                                        onClick={() => toggleUser(a._id || a)}
                                        disabled={loading}
                                        title="Remove assignment"
                                    >
                                        &times;
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {hasPermission && (
                <div className="assign-controls">
                    <h5>Manage Assignments</h5>
                    <div className="member-check-list">
                        {availableMembers.length === 0 ? <p className="small-text">No other members available to assign.</p> : (
                            availableMembers.map(m => (
                                <label  key={m._id}
                                className="checkbox-label">
                                    <input
                                        type="checkbox" 
                                        checked={false}
                                        onChange={() => toggleUser(m.user?._id || m.user)}
                                        disabled={loading}
                                        title={m.user.username || m.username}
                                    />
                                    {m.username}
                                </label>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssignmentManager