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

  // Fetch current user’s ID and role from /api/users/me
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
      setCurrentUserId(response.data.userId || response.data._id);
      setUserRole(response.data.role); // Adjust based on your API (e.g., 'student' or 'psychiatre')
      return response.data.userId || response.data._id;
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

  // Set up Socket.IO listener
  useEffect(() => {
    if (!currentUserId) return;

    console.log('Joining room for userId:', currentUserId);
    socket.emit('join', currentUserId);

    socket.on('new_notification', (notification) => {
      console.log('New notification received via WebSocket:', notification);
      if (notification.recipient?._id.toString() === currentUserId.toString()) {
        setNotifications((prev) => {
          if (prev.some((notif) => notif._id === notification._id)) return prev;
          const updatedNotifications = [notification, ...prev];
          console.log('Updated notifications:', updatedNotifications);
          return updatedNotifications;
        });
        if (!notification.read) {
          setUnreadCount((prev) => prev + 1);
        }
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
      // Optimistic UI update
      setNotifications((prev) => prev.filter((notif) => notif._id !== notificationId));
      setUnreadCount((prev) => Math.max(prev - 1, 0));

      // Mark as read on the server
      await axios.put(
        `http://localhost:5000/api/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Navigate based on user role
      if (appointmentId && userRole) {
        const dashboardPath =
          userRole.toLowerCase() === 'student'
            ? `${process.env.PUBLIC_URL}/appointment/student-dashboard`
            : userRole.toLowerCase() === 'psychiatre'
            ? `${process.env.PUBLIC_URL}/appointment/psychologist-dashboard`
            : `${process.env.PUBLIC_URL}/appointment/student-dashboard`; // Fallback
        navigate(`${dashboardPath}?highlight=${appointmentId}`);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      await fetchNotifications(); // Re-fetch on error
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    markAsReadAndNavigate(notification._id, notification.appointment?._id);
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