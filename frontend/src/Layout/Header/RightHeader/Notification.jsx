import React, { useState, useEffect } from 'react';
import { Bell, Calendar, CheckCircle, XCircle } from 'react-feather';
import { P } from '../../../AbstractElements';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';

// Initialize Socket.IO connection
const socket = io('http://localhost:5000', {
  transports: ['websocket'],
  reconnection: true,
  auth: { token: localStorage.getItem('token') || sessionStorage.getItem('token') },
});

socket.on('connect', () => {
  console.log('Connected to WebSocket server with ID:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('WebSocket connection error:', error.message);
});

const Notification = ({ active, setActive }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();

  // Fetch current user's ID and role from /api/users/me
  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      console.log('No token found, user not logged in');
      return null;
    }

    try {
      const response = await axios.get('http://localhost:5000/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Logged-in user:', response.data);
      const userId = response.data.userId || response.data._id;
      setCurrentUserId(userId);
      setUserRole(response.data.Role?.[0]); // Access first role since it's an array
      return userId;
    } catch (error) {
      console.error('Error fetching user:', error.response?.data || error.message);
      return null;
    }
  };

  // Fetch notifications from /api/notifications
  const fetchNotifications = async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    try {
      const response = await axios.get('http://localhost:5000/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Notifications fetched:', response.data);
      setNotifications(response.data);
      setUnreadCount(response.data.filter((notif) => !notif.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error.response?.data || error.message);
    }
  };

  // Initialize component
  useEffect(() => {
    const initialize = async () => {
      const userId = await fetchCurrentUser();
      if (userId) {
        await fetchNotifications();
      } else {
        console.log('Failed to fetch userId, Socket.IO not initialized');
      }
    };
    initialize();
  }, []);

  // Set up Socket.IO listener with improved handling
  useEffect(() => {
    if (!currentUserId) return;

    console.log('Joining room for userId:', currentUserId);
    socket.emit('join', currentUserId);

    socket.on('new_notification', (notification) => {
      console.log('New notification received in dropdown:', notification);
      
      // Debug the notification type specifically for appointment confirmations
      if (notification.type === 'appointment_confirmed') {
        console.log('CONFIRMATION NOTIFICATION RECEIVED:', notification);
      }
      
      try {
        // Handle all possible recipient structures
        const recipientId = (notification.recipient?._id || notification.recipient || '').toString();
        const currentId = (currentUserId || '').toString();
        
        console.log('ID comparison:', {
          recipientId,
          currentId,
          match: recipientId === currentId
        });
        
        if (recipientId === currentId) {
          // Add to notifications and ensure UI update
          setNotifications(prev => {
            // Check by _id to prevent duplicates
            if (prev.some(n => n._id === notification._id)) {
              console.log('Duplicate notification prevented');
              return prev;
            }
            console.log('Adding new notification to dropdown');
            return [notification, ...prev];
          });
          
          // Update unread count
          if (!notification.read) {
            console.log('Incrementing unread count');
            setUnreadCount(prev => prev + 1);
          }
        } else {
          console.log('Notification not for current user, ignoring');
        }
      } catch (error) {
        console.error('Error processing notification:', error);
      }
    });

    return () => {
      console.log('Cleaning up new_notification listener for userId:', currentUserId);
      socket.off('new_notification');
    };
  }, [currentUserId]);

  // Mark a notification as read and navigate to appropriate dashboard
  const markAsReadAndNavigate = async (notificationId, appointmentId) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    try {
      // Debug the notification click
      console.log('Marking notification as read:', notificationId);
      console.log('Appointment ID for navigation:', appointmentId);
      
      // Update UI optimistically first - ensure this happens regardless of API call
      setNotifications((prev) => 
        prev.map(notif => notif._id === notificationId ? {...notif, read: true} : notif)
      );
      setUnreadCount((prev) => Math.max(prev - 1, 0));
      
      // Set a flag to prevent multiple navigation attempts
      let navigationAttempted = false;

      // Mark as read on the server with proper error handling
      try {
        await axios.put(
          `http://localhost:5000/api/notifications/${notificationId}/read`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('Successfully marked notification as read on server');
      } catch (error) {
        console.error('Error marking notification as read on server:', error);
        // Don't revert optimistic UI updates - they should still work locally
      }

      // Navigate based on user role
      if (appointmentId && userRole && !navigationAttempted) {
        navigationAttempted = true;
        // Get user role and force lowercase for comparison
        const role = (userRole || '').toLowerCase();
        let dashboardPath = role === 'student' 
          ? "/appointment/student-dashboard" 
          : (role === 'psychiatre' || role === 'psychologist')
          ? "/appointment/psychologist-dashboard"
          : "/appointment/student-dashboard"; // Fallback
        
        // Ensure we have a valid URL with the highlight parameter
        const navigationUrl = `${process.env.PUBLIC_URL}${dashboardPath}?highlight=${appointmentId}`;
        console.log(`Navigating to: ${navigationUrl}`);
        
        // Force window navigation to ensure it works in all cases
        window.location.href = navigationUrl;
      } else {
        console.warn('Navigation skipped - missing data:', { 
          hasAppointmentId: !!appointmentId,
          userRole,
          navigationAttempted
        });
      }
    } catch (error) {
      console.error('Unexpected error in markAsReadAndNavigate:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    console.log('Notification clicked:', notification);
    // Make sure we extract the appointment ID correctly for all notification types
    const appointmentId = notification.appointment?._id || notification.appointment;
    
    if (!appointmentId) {
      console.error('No appointment ID found in notification:', notification);
    }
    
    markAsReadAndNavigate(notification._id, appointmentId);
  };

  // Format time ago
  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} sec`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hr`;
    return `${Math.floor(diffInSeconds / 86400)} days`;
  };

  // Get icon based on notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'appointment_booked':
      case 'appointment_modified':
        return <Calendar />;
      case 'appointment_confirmed':
        return <CheckCircle />;
      case 'appointment_cancelled':
      case 'appointment_rejected':
        return <XCircle />;
      default:
        return <Bell />;
    }
  };

  // Get notification message
  const getNotificationMessage = (notif) => {
    const senderName = notif.sender?.Name || 'Unknown';
    const appointmentDate = notif.appointment?.date
      ? new Date(notif.appointment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'unknown time';
    const appointmentDay = notif.appointment?.date
      ? new Date(notif.appointment.date).toLocaleDateString()
      : 'unknown date';

    switch (notif.type) {
      case 'appointment_booked':
        return `${senderName} a réservé un rendez-vous à ${appointmentDate} le ${appointmentDay}`;
      case 'appointment_confirmed':
        return `${senderName} a confirmé le rendez-vous à ${appointmentDate} le ${appointmentDay}`;
      case 'appointment_modified':
        return `${senderName} a modifié le rendez-vous à ${appointmentDate} le ${appointmentDay}`;
      case 'appointment_cancelled':
        return `${senderName} a annulé le rendez-vous à ${appointmentDate} le ${appointmentDay}`;
      case 'appointment_rejected':
        return `${senderName} a rejeté votre demande de rendez-vous pour le ${appointmentDate} le ${appointmentDay}`;
      default:
        return notif.message || 'New notification';
    }
  };

  const unreadNotifications = notifications.filter((notif) => !notif.read);

  return (
    <li className="onhover-dropdown">
      <div className="notification-box" style={{ position: 'relative' }}>
        <Bell onClick={() => setActive('notificationbox')} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              background: 'red',
              color: 'white',
              borderRadius: '50%',
              padding: '2px 6px',
              fontSize: '12px',
            }}
          >
            {unreadCount}
          </span>
        )}
      </div>
      <ul className={`notification-dropdown onhover-show-div ${active === 'notificationbox' ? 'active' : ''}`}>
        <li>
          <Bell />
          <h6 className="f-18 mb-0">Notifications</h6>
        </li>
        {unreadNotifications.length > 0 ? (
          unreadNotifications.slice(0, 5).map((notif) => (
            <li
              key={notif._id}
              style={{ cursor: 'pointer' }}
              onClick={() => handleNotificationClick(notif)}
            >
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">{getNotificationIcon(notif.type)}</div>
                <div className="flex-grow-1">
                  <P>
                    {getNotificationMessage(notif)}
                    <span className="pull-right">{formatTimeAgo(notif.createdAt)}</span>
                  </P>
                </div>
              </div>
            </li>
          ))
        ) : (
          <li>
            <P>No new notifications.</P>
          </li>
        )}
        <li>
          <a className="btn btn-primary" href={`${process.env.PUBLIC_URL}/notifications`}>
            View all notifications
          </a>
        </li>
      </ul>
    </li>
  );
};

export default Notification;