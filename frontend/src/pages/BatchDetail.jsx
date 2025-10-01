import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';

const LogReadingForm = ({ batchId, type, onUpdate }) => {
    const [value, setValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        if (type === 'pH' && (value < 5 || value > 8)) {
            setError("pH should typically be between 5.0 and 8.0.");
            setLoading(false);
            return;
        }

        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        try {
            // PUT /api/batches/:id/log
            await axios.put(`http://localhost:4000/api/batches/${batchId}/log`, { type, value: parseFloat(value) }, config);
            setValue('');
            onUpdate(); // Refresh parent data
        } catch (err) {
            setError(err.response?.data?.message || `Failed to log ${type}.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="log-form">
            <input
                type="number"
                step={type === 'pH' ? "0.1" : "0.01"}
                min="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={`${type} value`}
                required
            />
            <button type="submit" className='btn btn-sm' disabled={loading}>
                {loading ? 'Logging...' : `Log ${type}`}
            </button>
            {error && <p className='error-message-small'>{error}</p>}
        </form>
    );
};

const HarvestForm = ({ batchId, onUpdate, isHarvested }) => {
    const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        try {
            // PUT /api/batches/:id/harvest
            await axios.put(`http://localhost:4000/api/batches/${batchId}/harvest`, { harvestDate: date }, config);
            onUpdate(); // Refresh parent data
        } catch (err) {
            setError(err.response?.data?.message || "Failed to mark as harvested.");
        } finally {
            setLoading(false);
        }
    };
    
    if (isHarvested) return <p className="status-harvested">This batch has been harvested.</p>;

    return (
        <form onSubmit={handleSubmit} className="log-form harvest-form">
            <label>Harvest Date:</label>
            <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
            />
            <button type="submit" className='btn btn-success' disabled={loading}>
                {loading ? 'Completing...' : 'Mark as Harvested'}
            </button>
            {error && <p className='error-message-small'>{error}</p>}
        </form>
    );
};


const BatchDetails = () => {
    const { id: batchId } = useParams(); 
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Function to fetch data (used in useEffect and as a callback for form submission)
    const fetchBatch = async () => {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        try {
            const res = await axios.get(`http://localhost:4000/api/batches/${batchId}`, config); 
            setData(res.data);
            setLoading(false);
            setError(null); // Clear any previous errors
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
    const isHarvested = !!batchDetails.harvestDate;

    return (
        <div className="batch-details-page">
            <Link to="/batches" className='btn btn-back'>&larr; Back to Batches</Link>
            <h1>Batch Details: {batchDetails.name}</h1>
            
            {/* ... General Info Section (Unchanged) ... */}

            <section className="general-info">
                <h2>{batchDetails.cropType} Cycle</h2>
                <p><strong>Start Date:</strong> {new Date(batchDetails.startDate).toLocaleDateString()}</p>
                <p><strong>Harvest Date:</strong> {batchDetails.harvestDate ? new Date(batchDetails.harvestDate).toLocaleDateString() : 'Active'}</p>
            </section>            

            <hr/>
            
            {/* --- Environmental Logs and Update Forms --- */}
            <section className="environmental-logs">
                <h2>Environmental Logs & Actions</h2>
                <div className="log-data-grid">
                    <div>
                        <h4>Log New pH (Acidity)</h4>
                        <p>Current: {batchDetails.pHLog.length > 0 ? batchDetails.pHLog.slice(-1)[0].value : 'N/A'}</p>
                        <LogReadingForm batchId={batchId} type="pH" onUpdate={fetchBatch} />
                    </div>
                    <div>
                        <h4>Log New EC (Nutrient Strength)</h4>
                        <p>Current: {batchDetails.ecLog.length > 0 ? batchDetails.ecLog.slice(-1)[0].value : 'N/A'}</p>
                        <LogReadingForm batchId={batchId} type="EC" onUpdate={fetchBatch} />
                    </div>
                </div>

                <div className="harvest-action">
                    <h4>Batch Completion</h4>
                    <HarvestForm 
                        batchId={batchId} 
                        onUpdate={fetchBatch} 
                        isHarvested={isHarvested}
                    />
                </div>
            </section>
        </div>
    );
};

export default BatchDetails;