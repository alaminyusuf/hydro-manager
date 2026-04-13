import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/Authcontext'
import LogReadingForm from '../components/LogReadingForm';
import StatusTransition from '../components/StatusTransition';
import AssignmentManager from '../components/BatchAssignment';

const BatchDetails = () => {
    const { id: batchId } = useParams(); 
    const { activeOrg, organizations, hasRole } = useContext(AuthContext)
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const currentOrg = organizations.find(o => o._id === activeOrg);
    console.log(currentOrg)

    const fetchBatch = async () => {
        try {
            const res = await axios.get(`http://localhost:4000/api/batches/${batchId}`); 
            setData(res.data);
            setLoading(false);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load batch details.");
            setLoading(false);
        }
    };

    useEffect(() => {
        if (batchId) {
            setLoading(true);
            fetchBatch();
        }
    }, [batchId]); 

    if (loading) return <div className="loading-state">Loading Batch Details... ⏳</div>;
    if (error) return <div className="error-state">Error: {error}</div>;
    if (!data) return <div className="no-data-state">No data found for this batch.</div>;

    const { batchDetails } = data;
    const canManage = hasRole(['owner', 'admin', 'manager']);
    const canAssign = hasRole(['owner', 'admin']);

    return (
        <div className="batch-details-page">
            <Link to="/batches" className='btn btn-back'>&larr; Back to Batches</Link>
            
            <div className="batch-detail-header">
                <div className="title-area">
                    <h1>{batchDetails.name}</h1>
                    <span className={`status-badge ${batchDetails.status}`}>{batchDetails.status}</span>
                </div>
                <StatusTransition 
                    batchId={batchId} 
                    currentStatus={batchDetails.status} 
                    onUpdate={fetchBatch}
                    hasPermission={canManage}
                />
            </div>
            
            <div className="dashboard-grid">
                <div className="details-main">
                    <section className="card">
                        <h2>Batch Info</h2>
                        <div className="info-grid">
                            <p><strong>Crop:</strong> {batchDetails.cropType}</p>
                            <p><strong>Started:</strong> {new Date(batchDetails.startDate).toLocaleDateString()}</p>
                            {batchDetails.harvestDate && (
                                <p><strong>Harvested:</strong> {new Date(batchDetails.harvestDate).toLocaleDateString()}</p>
                            )}
                        </div>
                    </section>
                </div>

                <div className="details-sidebar">
                    <section className="card environmental-logs">
                        <h2>Environmental Logs</h2>
                        <div className="log-data-grid">
                            <div className="log-col">
                                <h4>pH (Acidity)</h4>
                                <p className="current-val">
                                    {batchDetails.pHLog.length > 0 ? batchDetails.pHLog.slice(-1)[0].value : 'N/A'}
                                </p>
                                <LogReadingForm batchId={batchId} type="pH" onUpdate={fetchBatch} />
                            </div>
                            <div className="log-col">
                                <h4>EC (Nutrients)</h4>
                                <p className="current-val">
                                    {batchDetails.ecLog.length > 0 ? batchDetails.ecLog.slice(-1)[0].value : 'N/A'}
                                </p>
                                <LogReadingForm batchId={batchId} type="EC" onUpdate={fetchBatch} />
                            </div>
                        </div>
                    </section>

                    <section className="card">
                        <AssignmentManager 
                            batchId={batchId}
                            currentAssignments={batchDetails.assignedTo || []}
                            orgMembers={currentOrg?.members || []}
                            onUpdate={fetchBatch}
                            hasPermission={canAssign}
                        />
                    </section>
                </div>
            </div>
        </div>
    );
};

export default BatchDetails;