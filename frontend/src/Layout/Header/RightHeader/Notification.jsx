import React, { useState, useEffect } from 'react';
import { Bell, Heart, MessageSquare, ThumbsDown } from 'react-feather'; // Ajout de ThumbsDown
import { P } from '../../../AbstractElements';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Notification = ({ active, setActive }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

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
      setNotifications((prevNotifications) =>
        prevNotifications.filter((notif) => notif._id !== notificationId)
      );
      setUnreadCount((prevCount) => prevCount - 1);

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

  const handleLinkClick = (e, notificationId) => {
    e.stopPropagation();
    markAsRead(notificationId);
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
                      onClick={(e) => handleLinkClick(e, notif._id)}
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