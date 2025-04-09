import React from 'react';
import { useOutletContext } from 'react-router-dom';
import AppointmentCalendar from './AppointmentCalendar';

const PsychologistDashboard = () => {
    // Method 1: Get user data from outlet context (preferred if component is rendered via PrivateRoute)
    const { userData } = useOutletContext() || {};
    
    // Method 2: Fallback to localStorage if outlet context is not available
    const localUser = !userData ? JSON.parse(localStorage.getItem('user') || '{}') : null;
    
    // Use either outlet context user or localStorage user
    const user = userData || localUser;

    // Debugging logs to verify data
    console.log('User data from Outlet:', userData);
    console.log('User data from localStorage:', localUser);
    console.log('Final user object:', user);

    // Ensure userId is retrieved correctly
    const userId = user.userId || user._id;

    if (!user || !userId) {
        return <div className="loading-container">Loading user data...</div>;
    }

    return (
        <div className="psychologist-dashboard">
            <h2>Manage Your Schedule</h2>
            <p>Welcome, Dr. {user.Name || 'Psychologist'}</p>
            <AppointmentCalendar 
                role={user.Role?.[0]?.toLowerCase() || 'psychiatre'} 
                userId={userId} 
            />
        </div>
    );
};

export default PsychologistDashboard;