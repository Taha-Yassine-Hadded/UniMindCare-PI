import React, { Fragment, useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody } from 'reactstrap';
import { Breadcrumbs, H4, P, UL } from '../../../AbstractElements';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Heart, MessageSquare, ThumbsDown, Calendar, CheckCircle, Edit, XCircle, Bell } from 'react-feather';
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  transports: ['websocket'],
  reconnection: true,
});

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      console.log('Aucun token trouvé, utilisateur non connecté');
      return;
    }

    try {
      const response = await axios.get('http://localhost:5000/api/users/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCurrentUserId(response.data._id);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error.response?.data || error.message);
    }
  };

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
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error.response?.data || error.message);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    socket.emit('join', currentUserId);

    socket.on('new_notification', (notification) => {
      console.log('Nouvelle notification reçue via WebSocket:', notification);
      if (notification.recipient._id.toString() === currentUserId.toString()) {
        setNotifications((prevNotifications) => [notification, ...prevNotifications]);
      }
    });

    return () => {
      socket.off('new_notification');
    };
  }, [currentUserId]);

  const markAsRead = async (notificationId) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      console.log('Aucun token trouvé pour marquer la notification comme lue');
      return;
    }

    try {
      await axios.put(
        `http://localhost:5000/api/notifications/${notificationId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setNotifications((prevNotifications) =>
        prevNotifications.map((notif) =>
          notif._id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la notification:', error.response?.data || error.message);
      await fetchNotifications();
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} sec`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hr`;
    return `${Math.floor(diffInSeconds / 86400)} jours`;
  };

  const handleNotificationClick = (notificationId) => {
    console.log('Clic sur la notification:', notificationId);
    markAsRead(notificationId);
  };

  const handleLinkClick = (e) => {
    e.stopPropagation();
  };

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

  const getNotificationLink = (notif) => {
    if (['like_post', 'like_comment', 'dislike_comment', 'comment'].includes(notif.type)) {
      return `${process.env.PUBLIC_URL}/blog/${notif.post?._id}`;
    }
    if (['appointment_booked', 'appointment_confirmed', 'appointment_modified', 'appointment_cancelled', 'appointment_rejected'].includes(notif.type)) {
      return `${process.env.PUBLIC_URL}/appointments/${notif.appointment?._id}`;
    }
    return '#';
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
                        onClick={() => handleNotificationClick(notif._id)}
                      >
                        <div className="d-flex align-items-center">
                          <div className="flex-shrink-0">{getNotificationIcon(notif.type)}</div>
                          <div className="flex-grow-1">
                            <P>
                              <Link
                                to={getNotificationLink(notif)}
                                onClick={handleLinkClick}
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