import React, { useState, useEffect } from 'react';
import { Bell, Calendar, CheckCircle, XCircle } from 'react-feather';
import { P } from '../../../AbstractElements';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';

// Get token once for consistent socket connection
const token = localStorage.getItem('token') || sessionStorage.getItem('token');

// Create a unique instance ID to track this component instance
const instanceId = Math.random().toString(36).substring(2, 9);

// Initialize Socket.IO connection - outside component to prevent multiple connections
const socket = io('http://localhost:5000', {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  auth: { token }
});

socket.on('connect', () => {
  console.log(`[${instanceId}] Connected to WebSocket server with ID:`, socket.id);
});

socket.on('connect_error', (error) => {
  console.error(`[${instanceId}] WebSocket connection error:`, error.message);
});

const Notification = ({ active, setActive }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();

  // Fetch current user's ID and role from /api/users/me
  const fetchCurrentUser = async () => {
    if (!token) {
      console.log(`[${instanceId}] No token found, user not logged in`);
      return null;
    }

    try {
      const response = await axios.get('http://localhost:5000/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`[${instanceId}] Logged-in user:`, response.data);
      const userId = response.data.userId || response.data._id;
      setCurrentUserId(userId);
      setUserRole(response.data.Role?.[0]); // Access first role since it's an array
      return userId;
    } catch (error) {
      console.error(`[${instanceId}] Error fetching user:`, error.response?.data || error.message);
      return null;
    }
  };

  // Fetch notifications from /api/notifications
  const fetchNotifications = async () => {
    if (!token) return;

    try {
      const response = await axios.get('http://localhost:5000/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`[${instanceId}] Notifications fetched:`, response.data);
      setNotifications(response.data);
      setUnreadCount(response.data.filter((notif) => !notif.read).length);
    } catch (error) {
      console.error(`[${instanceId}] Error fetching notifications:`, error.response?.data || error.message);
    }
  };

  // Initialize component
  useEffect(() => {
    const initialize = async () => {
      try {
        const userId = await fetchCurrentUser();
        if (userId) {
          await fetchNotifications();
          // Join the socket room on initialization
          console.log(`[${instanceId}] Joining room for userId:`, userId);
          socket.emit('join', userId);
        } else {
          console.log(`[${instanceId}] Failed to fetch userId, Socket.IO not initialized`);
        }
      } catch (error) {
        console.error(`[${instanceId}] Initialization error:`, error);
      }
    };
    initialize();

    // Cleanup function to ensure proper disconnection
    return () => {
      console.log(`[${instanceId}] Component unmounting - cleaning up listeners`);
    };
  }, []);

  // Handle socket.io notifications with dedicated event handler
  useEffect(() => {
    if (!currentUserId) return;

    console.log(`[${instanceId}] Setting up notification listener for userId:`, currentUserId);

    // Define the notification handler function
    const handleNewNotification = (notification) => {
      console.log(`[${instanceId}] New notification received:`, notification);
      
      // Special logging for confirmation notifications to debug
      if (notification.type === 'appointment_confirmed') {
        console.log(`[${instanceId}] 🔔 CONFIRMATION NOTIFICATION RECEIVED:`, {
          id: notification._id,
          type: notification.type,
          recipient: notification.recipient?._id || notification.recipient,
          sender: notification.sender?.Name,
          appointmentId: notification.appointment?._id
        });
      }
      
      try {
        // Handle all possible recipient structures with consistent string conversion
        const recipientId = String(notification.recipient?._id || notification.recipient || '');
        const currentId = String(currentUserId || '');
        
        console.log(`[${instanceId}] ID comparison:`, {
          recipientId,
          currentId,
          match: recipientId === currentId
        });
        
        if (recipientId === currentId) {
          // Add notification to state with duplication check
          setNotifications(prev => {
            // Check if notification already exists
            if (prev.some(n => n._id === notification._id)) {
              console.log(`[${instanceId}] Duplicate notification prevented:`, notification._id);
              return prev;
            }
            console.log(`[${instanceId}] Adding notification to dropdown:`, notification._id);
            return [notification, ...prev];
          });
          
          // Update unread count for new notifications
          if (!notification.read) {
            console.log(`[${instanceId}] Incrementing unread count`);
            setUnreadCount(prev => prev + 1);
          }
        } else {
          console.log(`[${instanceId}] Notification not for current user, ignoring`);
        }
      } catch (error) {
        console.error(`[${instanceId}] Error processing notification:`, error);
      }
    };

    // Remove any existing listeners to prevent duplicates
    socket.off('new_notification');
    
    // Add the new listener
    socket.on('new_notification', handleNewNotification);

    // Cleanup function
    return () => {
      console.log(`[${instanceId}] Removing notification listener for userId:`, currentUserId);
      socket.off('new_notification', handleNewNotification);
    };
  }, [currentUserId]);

  // Mark a notification as read and navigate to appropriate dashboard
  const markAsReadAndNavigate = async (notificationId, appointmentId) => {
    if (!token) return;

    try {
      console.log(`[${instanceId}] Marking notification as read:`, notificationId);
      console.log(`[${instanceId}] Will navigate to appointment:`, appointmentId);
      
      // Update UI optimistically
      setNotifications(prev => 
        prev.map(notif => notif._id === notificationId ? {...notif, read: true} : notif)
      );
      setUnreadCount(prev => Math.max(prev - 1, 0));
      
      // Flag to prevent multiple navigation attempts
      let navigationAttempted = false;

      // Mark as read on the server
      try {
        await axios.put(
          `http://localhost:5000/api/notifications/${notificationId}/read`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log(`[${instanceId}] Successfully marked notification as read on server`);
      } catch (error) {
        console.error(`[${instanceId}] Server error marking notification as read:`, error);
        // Don't revert UI state - keep the optimistic update
      }

      // Navigate to the appropriate dashboard
      if (appointmentId && userRole && !navigationAttempted) {
        navigationAttempted = true;
        
        // Determine target dashboard based on user role
        const role = String(userRole || '').toLowerCase();
        const dashboardPath = role === 'student' 
          ? "/appointment/student-dashboard" 
          : (role === 'psychiatre' || role === 'psychologist')
          ? "/appointment/psychologist-dashboard"
          : "/appointment/student-dashboard"; // Fallback
        
        // Create navigation URL with highlight parameter
        const baseUrl = process.env.PUBLIC_URL || '';
        const navigationUrl = `${baseUrl}${dashboardPath}?highlight=${appointmentId}`;
        console.log(`[${instanceId}] Navigating to:`, navigationUrl);
        
        // Use window.location for most reliable navigation
        window.location.href = navigationUrl;
      } else {
        console.warn(`[${instanceId}] Navigation skipped - missing data:`, { 
          hasAppointmentId: !!appointmentId,
          userRole,
          navigationAttempted
        });
      }
    } catch (error) {
      console.error(`[${instanceId}] Unexpected error in markAsReadAndNavigate:`, error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    console.log(`[${instanceId}] Notification clicked:`, notification);
    
    // Extract appointment ID, handling both object and string IDs
    const appointmentId = notification.appointment?._id || notification.appointment;
    
    if (!appointmentId) {
      console.error(`[${instanceId}] No appointment ID found in notification:`, notification);
      return;
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