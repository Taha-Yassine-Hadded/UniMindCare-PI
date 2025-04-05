import React, { Fragment, useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody } from 'reactstrap';
import { Breadcrumbs, H4, P, UL } from '../../../AbstractElements';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Heart, MessageSquare, ThumbsDown } from 'react-feather'; // Ajout de ThumbsDown

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);

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
    fetchNotifications();
  }, []);

  const markAsRead = async (notificationId) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      console.log('Aucun token trouvé pour marquer la notification comme lue');
      return;
    }

    try {
      console.log('Token utilisé:', token);
      console.log('Envoi de la requête PUT pour marquer la notification comme lue:', notificationId);
      const response = await axios.put(
        `http://localhost:5000/api/notifications/${notificationId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log('Réponse de la requête PUT:', response.data);
      await fetchNotifications();
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la notification:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
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
                          <div className="flex-shrink-0">
                            {notif.type === 'like_post' || notif.type === 'like_comment' ? (
                              <Heart />
                            ) : notif.type === 'dislike_comment' ? (
                              <ThumbsDown /> // Icône pour dislike
                            ) : (
                              <MessageSquare />
                            )}
                          </div>
                          <div className="flex-grow-1">
                            <P>
                              <Link
                                to={`${process.env.PUBLIC_URL}/blog/${notif.post._id}`}
                                onClick={handleLinkClick}
                              >
                                {notif.type === 'like_post' &&
                                  `${
                                    notif.isAnonymous
                                      ? 'Un utilisateur anonyme'
                                      : notif.sender?.Name || 'Inconnu'
                                  } a aimé votre publication "${notif.post.title}"`}
                                {notif.type === 'like_comment' &&
                                  `${
                                    notif.isAnonymous
                                      ? 'Un utilisateur anonyme'
                                      : notif.sender?.Name || 'Inconnu'
                                  } a aimé votre commentaire sur "${notif.post.title}"`}
                                {notif.type === 'dislike_comment' &&
                                  `${
                                    notif.isAnonymous
                                      ? 'Un utilisateur anonyme'
                                      : notif.sender?.Name || 'Inconnu'
                                  } n'a pas aimé votre commentaire sur "${notif.post.title}"`}
                                {notif.type === 'comment' &&
                                  `${
                                    notif.isAnonymous
                                      ? notif.anonymousPseudo || 'Un utilisateur anonyme'
                                      : notif.sender?.Name || 'Inconnu'
                                  } a commenté votre publication "${notif.post.title}"`}
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