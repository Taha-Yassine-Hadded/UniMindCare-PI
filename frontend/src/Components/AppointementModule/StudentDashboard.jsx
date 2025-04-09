import React from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import AppointmentCalendar from './AppointmentCalendar';

const StudentDashboard = () => {
    // Get psychologist ID from URL query parameter
    const [searchParams] = useSearchParams();
    const selectedPsychologistId = searchParams.get('psychologistId');
    
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
    console.log('Selected Psychologist ID:', selectedPsychologistId);

    // Ensure userId is retrieved correctly
    const userId = user.userId || user._id;

    if (!user || !userId) {
        return <div className="loading-container">Loading user data...</div>;
    }

    return (
        <div className="student-dashboard">
            <h2>Book an Appointment</h2>
            <p>Welcome, {user.Name || 'Student'}</p>
            <AppointmentCalendar 
                role={user.Role?.[0]?.toLowerCase() || 'student'} 
                userId={userId}
                selectedPsychologistId={selectedPsychologistId}
            />
        </div>
    );
};

export default StudentDashboard;