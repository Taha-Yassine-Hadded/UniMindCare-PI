import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ChatModal = ({ receiverUser, onClose }) => {
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
  const currentUser = storedUser ? JSON.parse(storedUser) : {};

  useEffect(() => {
    if (!token || !currentUser.Identifiant) {
      setError('Utilisateur non authentifié. Redirection vers la connexion...');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    const newSocket = io('http://localhost:5000', {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join', currentUser.Identifiant);
    });

    newSocket.on('connect_error', (err) => {
      setError('Erreur de connexion au serveur de messagerie');
    });

    const fetchMessages = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/messages/${currentUser.Identifiant}/${receiverUser.Identifiant}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessages(response.data);
        setLoading(false);
      } catch (error) {
        setError(error.response?.data?.message || 'Erreur lors du chargement des messages');
        setLoading(false);
      }
    };
    fetchMessages();

    newSocket.on('receiveMessage', (message) => {
      setMessages((prev) => {
        if (!prev.some((m) => m._id === message._id)) {
          return [...prev, message];
        }
        return prev;
      });
    });

    return () => {
      newSocket.off('receiveMessage');
      newSocket.off('connect_error');
      newSocket.off('connect');
      newSocket.disconnect();
    };
  }, [receiverUser.Identifiant, currentUser.Identifiant, token, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    if (!token || !currentUser.Identifiant) {
      setError('Utilisateur non authentifié. Redirection vers la connexion...');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }
    const messageData = {
      sender: currentUser.Identifiant,
      receiver: receiverUser.Identifiant,
      message: newMessage,
    };
    socket.emit('sendMessage', messageData, (response) => {
      if (response?.error) {
        setError(response.error);
      } else {
        setNewMessage('');
      }
    });
  };

  const styles = {
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: '8px',
      width: '90%',
      maxWidth: '600px',
      height: '80vh',
      display: 'flex',
      flexDirection: 'column',
    },
    modalHeader: {
      padding: '15px',
      borderBottom: '1px solid #eee',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: '#fff',
    },
    headerContent: {
      display: 'flex',
      alignItems: 'center',
    },
    avatar: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      background: '#ccc',
      marginRight: '10px',
    },
    closeButton: {
      border: 'none',
      background: 'none',
      fontSize: '24px',
      cursor: 'pointer',
    },
    messagesContainer: {
      flex: 1,
      overflow: 'auto',
      padding: '15px',
      background: '#f5f5f5', // Light gray background to match screenshot
    },
    message: {
      margin: '10px 0',
      padding: '10px',
      borderRadius: '15px',
      maxWidth: '70%',
      position: 'relative',
    },
    sentMessage: {
      backgroundColor: '#34c759', // Green color for sent messages
      color: 'white',
      marginLeft: 'auto',
    },
    receivedMessage: {
      backgroundColor: '#e5e5ea', // Gray color for received messages
      color: 'black',
      marginRight: 'auto',
    },
    messageContent: {
      margin: 0,
      wordBreak: 'break-word',
    },
    messageTime: {
      fontSize: '0.7em',
      opacity: 0.7,
      marginTop: '5px',
      textAlign: 'right',
    },
    inputContainer: {
      padding: '15px',
      borderTop: '1px solid #eee',
      display: 'flex',
      gap: '10px',
      background: '#fff',
    },
    input: {
      flex: 1,
      padding: '10px',
      borderRadius: '20px',
      border: '1px solid #ddd',
      outline: 'none',
    },
    sendButton: {
      padding: '10px 20px',
      backgroundColor: '#34c759', // Green button to match "END CALL" button style
      color: 'white',
      border: 'none',
      borderRadius: '20px',
      cursor: 'pointer',
    },
    error: {
      color: '#e74c3c',
      textAlign: 'center',
      padding: '15px',
    },
  };

  if (error) {
    return (
      <div style={styles.modal}>
        <div style={styles.modalContent}>
          <div style={styles.modalHeader}>
            <h3>Erreur</h3>
            <button onClick={onClose} style={styles.closeButton}>×</button>
          </div>
          <p style={styles.error}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <div style={styles.headerContent}>
            <div style={styles.avatar} />
            <div>
              <h3 style={{ margin: 0 }}>{receiverUser.Name}</h3>
              <p style={{ margin: 0, fontSize: '0.9em', color: '#666' }}>
                May 5, 5:30 PM {/* Static timestamp to match screenshot */}
              </p>
            </div>
          </div>
          <div>
            {/* Icons for additional actions (e.g., search, attach, audio, video) */}
            <button style={{ border: 'none', background: 'none', cursor: 'pointer', marginRight: '10px' }}>
              🔍
            </button>
            <button style={{ border: 'none', background: 'none', cursor: 'pointer', marginRight: '10px' }}>
              📎
            </button>
            <button style={{ border: 'none', background: 'none', cursor: 'pointer', marginRight: '10px' }}>
              🎙️
            </button>
            <button style={{ border: 'none', background: 'none', cursor: 'pointer', marginRight: '10px' }}>
              📹
            </button>
            <button onClick={onClose} style={styles.closeButton}>×</button>
          </div>
        </div>
        <div style={styles.messagesContainer}>
          {loading ? (
            <p>Chargement des messages...</p>
          ) : messages.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666' }}>Aucun message pour l'instant</p>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  ...styles.message,
                  ...(msg.sender === currentUser.Identifiant
                    ? styles.sentMessage
                    : styles.receivedMessage),
                }}
              >
                <p style={styles.messageContent}>{msg.message}</p>
                <span style={styles.messageTime}>
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        <div style={styles.inputContainer}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Aa"
            style={styles.input}
          />
          <button onClick={handleSendMessage} style={styles.sendButton}>
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;