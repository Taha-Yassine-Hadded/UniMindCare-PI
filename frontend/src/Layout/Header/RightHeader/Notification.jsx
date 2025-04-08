import React, { useState, useEffect } from 'react';
import { Bell, Heart, MessageSquare, ThumbsDown, Calendar, CheckCircle, Edit, XCircle } from 'react-feather';
import { P } from '../../../AbstractElements';
import { Link } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';

// Initialize Socket.IO connection
const socket = io('http://localhost:5000', {
  transports: ['websocket'],
  reconnection: true,
  auth: { token: localStorage.getItem('token') || sessionStorage.getItem('token') }, // Include token for authentication
});

// Log connection status
socket.on('connect', () => {
  console.log('Connecté au serveur WebSocket avec l\'ID:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('Erreur de connexion WebSocket:', error.message);
});

const Notification = ({ active, setActive }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Fetch current user’s ID from /api/users/me
  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      console.log('Aucun token trouvé, utilisateur non connecté');
      return null;
    }

    try {
      const response = await axios.get('http://localhost:5000/api/users/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('Utilisateur connecté:', response.data);
      return response.data.userId;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error.response?.data || error.message);
      return null;
    }
  };

  // Fetch notifications from /api/notifications
  const fetchNotifications = async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      console.log('Aucun token trouvé, utilisateur non connecté');
      return;
    }

    try {
      const response = await axios.get('http://localhost:5000/api/notifications', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('Notifications récupérées:', response.data);
      setNotifications(response.data);
      setUnreadCount(response.data.filter((notif) => !notif.read).length);
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error.response?.data || error.message);
    }
  };

  // Initialize component by fetching user and notifications
  useEffect(() => {
    const initialize = async () => {
      const userId = await fetchCurrentUser();
      if (userId) {
        setCurrentUserId(userId);
        await fetchNotifications();
      } else {
        console.log('Échec de la récupération de l\'userId, Socket.IO non initialisé');
      }
    };
    initialize();
  }, []);

  // Set up Socket.IO listener for new notifications
  useEffect(() => {
    if (!currentUserId) {
      console.log('currentUserId non défini, Socket.IO non initialisé');
      return;
    }

    console.log('Rejoindre la salle pour userId:', currentUserId);
    socket.emit('join', currentUserId);

    socket.on('new_notification', (notification) => {
      console.log('Nouvelle notification reçue via WebSocket:', notification);
      console.log('Destinataire de la notification:', notification.recipient?._id);
      console.log('Utilisateur connecté:', currentUserId);

      if (notification.recipient?._id.toString() === currentUserId.toString()) {
        console.log('Mise à jour des notifications et du compteur');
        setNotifications((prevNotifications) => {
          // Prevent duplicate notifications
          if (prevNotifications.some((notif) => notif._id === notification._id)) {
            console.log('Notification déjà présente:', notification._id);
            return prevNotifications;
          }
          const updatedNotifications = [notification, ...prevNotifications];
          console.log('Notifications mises à jour:', updatedNotifications);
          return updatedNotifications;
        });
        if (!notification.read) {
          setUnreadCount((prevCount) => {
            const newCount = prevCount + 1;
            console.log('Nouveau unreadCount:', newCount);
            return newCount;
          });
        }
      } else {
        console.log('Notification ignorée: destinataire incorrect', {
          receivedRecipient: notification.recipient?._id,
          currentUserId,
        });
      }
    });

    return () => {
      console.log('Nettoyage du listener new_notification pour userId:', currentUserId);
      socket.off('new_notification');
    };
  }, [currentUserId]);

  // Debug state changes
  useEffect(() => {
    console.log('Notifications state:', notifications);
    console.log('Unread count:', unreadCount);
  }, [notifications, unreadCount]);

  // Mark a notification as read
  const markAsRead = async (notificationId) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      console.log('Aucun token trouvé pour marquer la notification comme lue');
      return;
    }

    try {
      setNotifications((prevNotifications) =>
        prevNotifications.filter((notif) => notif._id !== notificationId)
      );
      setUnreadCount((prevCount) => Math.max(prevCount - 1, 0));

      await axios.put(
        `http://localhost:5000/api/notifications/${notificationId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la notification:', error.response?.data || error.message);
      await fetchNotifications(); // Re-fetch on error to restore state
    }
  };

  // Format time ago for display
  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} sec`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hr`;
    return `${Math.floor(diffInSeconds / 86400)} jours`;
  };

  // Handle link click to mark notification as read
  const handleLinkClick = (e, notificationId) => {
    e.stopPropagation();
    markAsRead(notificationId);
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
    const senderName = notif.isAnonymous
      ? notif.anonymousPseudo || 'Utilisateur anonyme'
      : notif.sender?.Name || 'Inconnu';
    const appointmentDate = notif.appointment?.date
      ? new Date(notif.appointment.date).toLocaleString()
      : 'une date inconnue';

    switch (notif.type) {
      case 'like_post':
        return `${senderName} a aimé votre publication "${notif.post?.title || 'Inconnue'}"`;
      case 'like_comment':
        return `${senderName} a aimé votre commentaire sur "${notif.post?.title || 'Inconnue'}"`;
      case 'dislike_comment':
        return `${senderName} n'a pas aimé votre commentaire sur "${notif.post?.title || 'Inconnue'}"`;
      case 'comment':
        return `${senderName} a commenté votre publication "${notif.post?.title || 'Inconnue'}"`;
      case 'appointment_booked':
        return `${senderName} a réservé un rendez-vous pour le ${appointmentDate}`;
      case 'appointment_confirmed':
        return `${senderName} a confirmé votre rendez-vous pour le ${appointmentDate}`;
      case 'appointment_modified':
        return `${senderName} a modifié le rendez-vous du ${appointmentDate}`;
      case 'appointment_cancelled':
        return `${senderName} a annulé le rendez-vous du ${appointmentDate}`;
      case 'appointment_rejected':
        return `${senderName} a rejeté votre demande de rendez-vous pour le ${appointmentDate}`;
      default:
        return notif.message || 'Nouvelle notification';
    }
  };

  // Get link for notification
  const getNotificationLink = (notif) => {
    if (['like_post', 'like_comment', 'dislike_comment', 'comment'].includes(notif.type)) {
      return `${process.env.PUBLIC_URL}/blog/${notif.post?._id}`;
    }
    if (['appointment_booked', 'appointment_confirmed', 'appointment_modified', 'appointment_cancelled', 'appointment_rejected'].includes(notif.type)) {
      return `${process.env.PUBLIC_URL}/appointments/${notif.appointment?._id}`;
    }
    return '#';
  };

  // Filter unread notifications
  const unreadNotifications = notifications.filter((notif) => !notif.read);

  // Debug rendered notifications
  console.log('unreadNotifications rendered:', unreadNotifications);

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
      <ul
        className={`notification-dropdown onhover-show-div ${
          active === 'notificationbox' ? 'active' : ''
        }`}
      >
        <li>
          <Bell />
          <h6 className="f-18 mb-0">Notifications</h6>
        </li>
        {unreadNotifications.length > 0 ? (
          unreadNotifications.slice(0, 5).map((notif) => (
            <li key={notif._id} style={{ cursor: 'pointer' }}>
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">{getNotificationIcon(notif.type)}</div>
                <div className="flex-grow-1">
                  <P>
                    <Link
                      to={getNotificationLink(notif)}
                      onClick={(e) => handleLinkClick(e, notif._id)}
                    >
                      {getNotificationMessage(notif)}
                    </Link>
                    <span className="pull-right">{formatTimeAgo(notif.createdAt)}</span>
                  </P>
                </div>
              </div>
            </li>
          ))
        ) : (
          <li>
            <P>Aucune nouvelle notification.</P>
          </li>
        )}
        <li>
          <Link className="btn btn-primary" to={`${process.env.PUBLIC_URL}/notifications`}>
            Voir toutes les notifications
          </Link>
        </li>
      </ul>
    </li>
  );
};

export default Notification;