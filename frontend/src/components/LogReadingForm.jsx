import React, { useState } from 'react';
import axios from 'axios';

const LogReadingForm = ({ batchId, type, onUpdate }) => {
    const [value, setValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            await axios.put(`http://localhost:4000/api/batches/${batchId}/log`, { type, value: parseFloat(value) });
            setValue('');
            onUpdate();
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

export default LogReadingForm;
