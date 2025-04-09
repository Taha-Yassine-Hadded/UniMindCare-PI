import React, { Fragment, useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody } from 'reactstrap';
import { Breadcrumbs, H4, P, UL } from '../../../AbstractElements';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Bell, Heart, MessageSquare, ThumbsDown, Calendar, CheckCircle, XCircle } from 'react-feather';
import io from 'socket.io-client';

const token = localStorage.getItem('token') || sessionStorage.getItem('token');
const instanceId = Math.random().toString(36).substring(2, 9);

const socket = io('http://localhost:5000', {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  auth: { token }
});

socket.on('connect', () => {
  console.log(`[${instanceId}] Connecté au serveur WebSocket avec l'ID:`, socket.id);
});

socket.on('connect_error', (error) => {
  console.error(`[${instanceId}] Erreur de connexion WebSocket:`, error);
});

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();

  // Fetch current user
  const fetchCurrentUser = async () => {
    if (!token) {
      console.log(`[${instanceId}] Aucun token trouvé`);
      return null;
    }
    try {
      const response = await axios.get('http://localhost:5000/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userId = response.data._id || response.data.userId;
      setCurrentUserId(userId);
      setUserRole(response.data.Role?.[0]);
      return userId;
    } catch (error) {
      console.error(`[${instanceId}] Erreur récupération utilisateur:`, error);
      return null;
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const response = await axios.get('http://localhost:5000/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(response.data);
    } catch (error) {
      console.error(`[${instanceId}] Erreur récupération notifications:`, error);
    }
  };

  // Initialize component
  useEffect(() => {
    const initialize = async () => {
      const userId = await fetchCurrentUser();
      if (userId) {
        await fetchNotifications();
        socket.emit('join', userId);
      }
    };
    initialize();
    return () => {
      console.log(`[${instanceId}] Nettoyage lors du démontage`);
    };
  }, []);

  // Socket.IO listener
  useEffect(() => {
    if (!currentUserId) return;

    const handleNewNotification = (notification) => {
      const recipientId = String(notification.recipient?._id || notification.recipient || '');
      if (recipientId === String(currentUserId)) {
        setNotifications((prev) => {
          if (prev.some((n) => n._id === notification._id)) return prev;
          return [notification, ...prev];
        });
      }
    };

    socket.off('new_notification');
    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [currentUserId]);

  // Mark as read and navigate
  const markAsReadAndNavigate = async (notificationId, redirectUrl) => {
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

      if (redirectUrl) {
        if (redirectUrl.startsWith('http')) {
          window.location.href = redirectUrl;
        } else {
          navigate(redirectUrl);
        }
      }
    } catch (error) {
      console.error(`[${instanceId}] Erreur mise à jour notification:`, error);
      await fetchNotifications();
    }
  };

  // Handle notification click
  const handleNotificationClick = (notif) => {
    let redirectUrl = null;
    if (notif.type.includes('appointment') && notif.appointment?._id) {
      const role = String(userRole || '').toLowerCase();
      const dashboardPath = role === 'student'
        ? '/appointment/student-dashboard'
        : (role === 'psychiatre' || role === 'psychologist')
        ? '/appointment/psychologist-dashboard'
        : '/appointment/student-dashboard';
      redirectUrl = `${dashboardPath}?highlight=${notif.appointment._id}`;
    } else if (notif.post?._id) {
      redirectUrl = `${process.env.PUBLIC_URL}/blog/${notif.post._id}`;
    }

    if (!notif.read && redirectUrl) {
      markAsReadAndNavigate(notif._id, redirectUrl);
    } else if (redirectUrl) {
      navigate(redirectUrl);
    }
  };

  // Format time ago
  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
    if (diffInSeconds < 60) return `${diffInSeconds} sec`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hr`;
    return `${Math.floor(diffInSeconds / 86400)} jours`;
  };

  // Get icon based on notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like_post':
      case 'like_comment':
        return <Heart />;
      case 'dislike_comment':
        return <ThumbsDown />;
      case 'comment':
        return <MessageSquare />;
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
    const senderName = notif.isAnonymous ? (notif.anonymousPseudo || 'Utilisateur anonyme') : (notif.sender?.Name || 'Inconnu');
    if (notif.type.includes('appointment')) {
      const appointmentDate = notif.appointment?.date
        ? new Date(notif.appointment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'heure inconnue';
      const appointmentDay = notif.appointment?.date
        ? new Date(notif.appointment.date).toLocaleDateString()
        : 'date inconnue';
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
          return `${senderName} a rejeté votre demande à ${appointmentDate} le ${appointmentDay}`;
        default:
          return notif.message || 'Nouvelle notification';
      }
    } else {
      switch (notif.type) {
        case 'like_post':
          return `${senderName} a aimé votre publication "${notif.post?.title || '...'}"`;
        case 'like_comment':
          return `${senderName} a aimé votre commentaire sur "${notif.post?.title || '...'}"`;
        case 'dislike_comment':
          return `${senderName} n'a pas aimé votre commentaire sur "${notif.post?.title || '...'}"`;
        case 'comment':
          return `${senderName} a commenté votre publication "${notif.post?.title || '...'}"`;
        default:
          return notif.message || 'Nouvelle notification';
      }
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
                      <P>Aucune notification pour le moment.</P>
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
