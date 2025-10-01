import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Define the available crop types for the dropdown
const CROP_TYPES = ['Lettuce', 'Herbs', 'Tomato', 'Cucumber', 'Strawberries', 'Other'];

const NewBatch = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        cropType: CROP_TYPES[0], // Default to the first type
        startDate: new Date().toISOString().substring(0, 10), // Default to today's date in YYYY-MM-DD format
        // harvestDate is left blank and managed on the Batches page when the cycle ends
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const onChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        const token = localStorage.getItem('token');
        if (!token) {
            setError("Authorization required. Please log in.");
            setLoading(false);
            return;
        }

        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        try {
            // POST to the /api/batches route
            await axios.post('http://localhost:4000/api/batches', formData, config); 
            
            setSuccess(true);
            
            setTimeout(() => {
                navigate('/batches');
            }, 1500);

        } catch (err) {
            console.error("Error starting new batch:", err.response?.data?.message || err.message);
            setError(err.response?.data?.message || "Failed to start new batch.");
            setLoading(false);
        }
    };

    return (
        <div className='new-batch-page'>
            <h1>Start a New Grow Batch</h1>
            <p>Log a new hydroponics cycle to start tracking its dedicated expenses and environmental logs.</p>

            <div className='form-container'>
                <form onSubmit={onSubmit} className='batch-form'>
                    {error && <p className="error-message">{error}</p>}
                    {success && <p className="success-message">Batch started successfully! Redirecting...</p>}

                    <div className='form-group'>
                        <label htmlFor='name'>Batch Name / Identifier</label>
                        <input
                            type='text'
                            id='name'
                            name='name'
                            value={formData.name}
                            onChange={onChange}
                            placeholder='e.g., Lettuce Run 4, Winter Basil'
                            required
                        />
                    </div>

                    <div className='form-group'>
                        <label htmlFor='cropType'>Crop Type</label>
                        <select
                            id='cropType'
                            name='cropType'
                            value={formData.cropType}
                            onChange={onChange}
                            required
                        >
                            {CROP_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className='form-group'>
                        <label htmlFor='startDate'>Start Date</label>
                        <input
                            type='date'
                            id='startDate'
                            name='startDate'
                            value={formData.startDate}
                            onChange={onChange}
                            required
                        />
                    </div>

                    <button type='submit' className='btn btn-primary' disabled={loading}>
                        {loading ? 'Starting...' : 'Start Batch'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default NewBatch;