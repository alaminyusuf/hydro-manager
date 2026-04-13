import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/Authcontext';

const NotificationPanel = () => {
    const { user } = useContext(AuthContext);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const panelRef = useRef(null);

    const fetchNotifications = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:4000/api/notifications');
            setNotifications(res.data.notifications);
            setUnreadCount(res.data.unreadCount);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Set up polling for new notifications (every 30 seconds for now)
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id) => {
        try {
            await axios.put(`http://localhost:4000/api/notifications/${id}/read`);
            setNotifications(notifications.map(n => n._id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    const markAllRead = async () => {
        try {
            await axios.put('http://localhost:4000/api/notifications/read-all');
            setNotifications(notifications.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Error marking all notifications as read:', err);
        }
    };

    return (
        <div className="notification-container" ref={panelRef}>
            <button 
                className="notification-trigger" 
                onClick={() => setIsOpen(!isOpen)}
                title="Notifications"
            >
                <span className="bell-icon">🔔</span>
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>

            {isOpen && (
                <div className="notification-panel">
                    <div className="notification-header">
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <button onClick={markAllRead} className="btn-text">Mark all read</button>
                        )}
                    </div>
                    <div className="notification-list">
                        {loading && notifications.length === 0 ? (
                            <p className="loading-text">Loading...</p>
                        ) : notifications.length === 0 ? (
                            <p className="empty-text">No notifications yet.</p>
                        ) : (
                            notifications.map(notification => (
                                <div 
                                    key={notification._id} 
                                    className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                                    onClick={() => !notification.read && markAsRead(notification._id)}
                                >
                                    <div className="notification-content">
                                        <h4>{notification.title}</h4>
                                        <p>{notification.message}</p>
                                        <span className="notification-time">
                                            {new Date(notification.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                    {!notification.read && <span className="unread-dot"></span>}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationPanel;
