import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/Authcontext'

const Expenses = () => {
    const { activeOrg, hasRole } = useContext(AuthContext)
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterType, setFilterType] = useState('all'); // 'all', 'income', 'expense'

    useEffect(() => {
        const fetchTransactions = async () => {
            if (!activeOrg) {
                setLoading(false);
                return;
            }
            
            setLoading(true);
            try {
                // Uses the GET /api/expenses route
                const res = await axios.get('http://localhost:4000/api/expenses'); 
                setTransactions(res.data);
                setLoading(false);
                setError(null);
            } catch (err) {
                console.error("Error fetching transactions:", err);
                setError("Failed to load transactions.");
                setLoading(false);
            }
        };
        fetchTransactions();
    }, [activeOrg]);

    // Filter transactions based on the selected type
    const filteredTransactions = transactions.filter(t => {
        if (filterType === 'all') return true;
        if (filterType === 'income') return t.isIncome === true;
        if (filterType === 'expense') return t.isIncome === false;
        return true;
    });

    if (!activeOrg)
        return (
            <div className='no-org-state'>
                <h2>No Organization Selected</h2>
                <p>Please select an organization to view transactions.</p>
                <Link to='/organizations' className='btn'>Manage Organizations</Link>
            </div>
        )
    if (loading) return <div className="loading-state">Loading transactions... ⏳</div>;
    if (error) return <div className="error-state">Error: {error}</div>;

    return (
        <div className="expenses-page">
            <h1>Financial Transactions Log</h1>
            
            <div className="utility-bar">
                {hasRole(['owner', 'admin', 'manager']) && (
                    <Link to="/new-expense" className="btn btn-primary">+ New Transaction</Link>
                )}
                <div className="filter-group">
                    <label>Show:</label>
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                        <option value="all">All</option>
                        <option value="income">Income</option>
                        <option value="expense">Expenses</option>
                    </select>
                </div>
            </div>

            {filteredTransactions.length === 0 ? (
                <p className='no-data-message'>No transactions found. Start by logging a new expense or income!</p>
            ) : (
                <div className="transaction-table-wrapper">
                    <table className="transaction-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Category</th>
                                <th>Description</th>
                                <th>Amount</th>
                                <th>Date</th>
                                <th>Batch Link</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.map(t => (
                                <tr key={t._id} className={t.isIncome ? 'row-income' : 'row-expense'}>
                                    <td>{t.isIncome ? 'INCOME' : 'EXPENSE'}</td>
                                    <td>{t.category}</td>
                                    <td>{t.description || 'N/A'}</td>
                                    <td className='amount'>{t.isIncome ? '+' : '-'}${Math.abs(t.amount).toFixed(2)}</td>
                                    <td>{new Date(t.date).toLocaleDateString()}</td>
                                    <td>
                                        {t.batch ? (
                                            <Link to={`/batches/${t.batch._id}`}>{t.batch.name}</Link>
                                        ) : (
                                            'General'
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Expenses;