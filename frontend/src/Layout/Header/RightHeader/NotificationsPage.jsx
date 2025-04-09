import React, { Fragment, useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody } from 'reactstrap';
import { Breadcrumbs, H4, P, UL } from '../../../AbstractElements';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Bell, Calendar, CheckCircle, XCircle } from 'react-feather';
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  transports: ['websocket'],
  reconnection: true,
});

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();

  // Fetch current user
  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      console.log('No token found, user not logged in');
      return;
    }

    try {
      const response = await axios.get('http://localhost:5000/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCurrentUserId(response.data.userId || response.data._id);
      setUserRole(response.data.Role?.[0]); // Access first role since it's an array
    } catch (error) {
      console.error('Error fetching user:', error.response?.data || error.message);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    try {
      const response = await axios.get('http://localhost:5000/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Notifications fetched:', response.data);
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error.response?.data || error.message);
    }
  };

  // Initialize component
  useEffect(() => {
    fetchCurrentUser();
    fetchNotifications();
  }, []);

  // Socket.IO listener
  useEffect(() => {
    if (!currentUserId) return;

    socket.emit('join', currentUserId);

    socket.on('new_notification', (notification) => {
      console.log('New notification received via WebSocket:', notification);
      if (notification.recipient._id.toString() === currentUserId.toString()) {
        setNotifications((prev) => [notification, ...prev]);
      }
    });

    return () => {
      socket.off('new_notification');
    };
  }, [currentUserId]);

  // Mark as read and navigate
  const markAsReadAndNavigate = async (notificationId, appointmentId) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    try {
      await axios.put(
        `http://localhost:5000/api/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications((prev) =>
        prev.map((notif) => (notif._id === notificationId ? { ...notif, read: true } : notif))
      );

      if (appointmentId && userRole) {
        // Get user role and force lowercase for comparison
        const role = (userRole || '').toLowerCase();
        const dashboardPath = role === 'student' 
          ? "/appointment/student-dashboard" 
          : role === 'psychiatre' || role === 'psychologist'
          ? "/appointment/psychologist-dashboard"
          : "/appointment/student-dashboard"; // Fallback
          
        console.log(`Navigating to: ${dashboardPath}?highlight=${appointmentId}`);
        // Use window.location.href for a full page navigation to ensure consistent behavior
        window.location.href = `${dashboardPath}?highlight=${appointmentId}`;
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      await fetchNotifications();
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsReadAndNavigate(notification._id, notification.appointment?._id);
    } else if (notification.appointment?._id && userRole) {
      const dashboardPath =
        userRole.toLowerCase() === 'student'
          ? `${process.env.PUBLIC_URL}/appointment/student-dashboard`
          : userRole.toLowerCase() === 'psychiatre'
          ? `${process.env.PUBLIC_URL}/appointment/psychologist-dashboard`
          : `${process.env.PUBLIC_URL}/appointment/student-dashboard`; // Fallback
      navigate(`${dashboardPath}?highlight=${notification.appointment._id}`);
    }
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

  return (
    <Fragment>
      <Breadcrumbs mainTitle="Notifications" parent="Pages" title="Notifications" />
      <Container fluid={true}>
        <Row>
          <Col sm="12">
            <Card>
              <CardBody>
                <H4>Notifications</H4>
                <UL attrUL={{ className: 'simple-list' }}>
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <li
                        key={notif._id}
                        style={{
                          backgroundColor: notif.read ? 'white' : '#f0f8ff',
                          padding: '10px',
                          marginBottom: '10px',
                          borderRadius: '5px',
                          cursor: 'pointer',
                        }}
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
                      <P>No notifications yet.</P>
                    </li>
                  )}
                </UL>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </Fragment>
  );
};

export default NotificationsPage;