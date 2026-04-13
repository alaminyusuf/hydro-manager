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
        const isAssigned = currentAssignments.some(a => (a._id || a) === userId);
        let newIds;
        if (isAssigned) {
            newIds = currentAssignments.filter(a => (a._id || a) !== userId).map(a => a._id || a);
        } else {
            newIds = [...currentAssignments.map(a => a._id || a), userId];
        }
        handleAssign(newIds);
    };

    return (
        <div className="assignment-manager">
            <h4>Assigned Members</h4>
            <div className="assigned-list">
                {currentAssignments.length === 0 ? <p>No one assigned.</p> : (
                    <ul>
                        {currentAssignments.map(a => (
                            <li key={a._id || a}>{a.full_Name || a.email || 'User'}</li>
                        ))}
                    </ul>
                )}
            </div>
            {hasPermission && (
                <div className="assign-controls">
                    <h5>Manage Assignments</h5>
                    <div className="member-check-list">
                        {orgMembers.map(m => (
                            <label  key={m._id}
                            className="checkbox-label">
                                <input
                                    type="checkbox" 
                                    checked={currentAssignments.some(a => (a._id || a) === m.user._id)}
                                    onChange={() => toggleUser(m.user._id)}
                                    disabled={loading}
                                    title={m.user.username}
                                />
                                {m.user}
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssignmentManager