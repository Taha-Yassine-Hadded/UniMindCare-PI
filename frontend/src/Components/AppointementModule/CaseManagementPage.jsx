import React from 'react';
import { useOutletContext } from 'react-router-dom';
import CaseManagement from './CaseManagement';

const CaseManagementPage = () => {
    // Method 1: Get user data from outlet context (preferred if component is rendered via PrivateRoute)
    const { userData } = useOutletContext() || {};
    
    // Method 2: Fallback to localStorage if outlet context is not available
    const localUser = !userData ? JSON.parse(localStorage.getItem('user') || '{}') : null;
    
    // Use either outlet context user or localStorage user
    const user = userData || localUser;

    // Ensure userId is retrieved correctly
    const userId = user.userId || user._id;

    if (!user || !userId) {
        return <div className="loading-container">Loading user data...</div>;
    }

    return (
        <div className="case-management-page">
            <CaseManagement psychologistId={userId} />
        </div>
    );
};

export default CaseManagementPage;