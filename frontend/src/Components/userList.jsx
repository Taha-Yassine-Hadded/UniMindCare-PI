import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { FiSearch, FiPaperclip, FiMic, FiVideo, FiSend } from 'react-icons/fi';

const UserList = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null); // Reference for file input

  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
  const currentUser = storedUser ? JSON.parse(storedUser) : {};

  useEffect(() => {
    const socketInstance = io('http://localhost:5000', {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    setSocket(socketInstance);

    socketInstance.on('onlineUsers', (onlineUsersList) => {
      console.log('Online users updated:', onlineUsersList);
      setOnlineUsers(onlineUsersList);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Erreur connexion Socket.IO:', err.message);
      setError('Erreur de connexion au serveur');
    });

    socketInstance.on('connect', () => {
      socketInstance.emit('join', currentUser.Identifiant);
    });

    socketInstance.on('receiveMessage', (message) => {
      setMessages((prev) => {
        if (!prev.some((m) => m._id === message._id)) {
          return [...prev, message];
        }
        return prev;
      });
    });

    const fetchUsers = async () => {
      try {
        console.log('Token utilisé pour fetchUsers:', token);
        if (!token) {
          setError('Utilisateur non authentifié. Redirection vers la connexion...');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }
        const res = await axios.get('http://localhost:5000/api/users/all?role=student', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(res.data);
      } catch (error) {
        setError(error.response?.data?.message || 'Erreur lors du chargement des étudiants');
        console.error('Erreur fetchUsers:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();

    return () => {
      socketInstance.off('onlineUsers');
      socketInstance.off('connect_error');
      socketInstance.off('receiveMessage');
      socketInstance.off('connect');
      socketInstance.disconnect();
    };
  }, [token, navigate, currentUser.Identifiant]);

  useEffect(() => {
    if (!selectedUser) return;

    const fetchMessages = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/messages/${currentUser.Identifiant}/${selectedUser.Identifiant}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessages(response.data);
      } catch (error) {
        setError(error.response?.data?.message || 'Erreur lors du chargement des messages');
      }
    };
    fetchMessages();
  }, [selectedUser, currentUser.Identifiant, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openChat = (user) => {
    console.log('Utilisateur sélectionné pour chat:', user);
    if (!user.Identifiant) {
      console.error('Identifiant manquant pour l’utilisateur:', user);
      return;
    }
    setSelectedUser({
      Identifiant: user.Identifiant,
      Name: user.Name,
      Email: user.Email,
    });
    setMessages([]);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedUser) return;
    if (!token || !currentUser.Identifiant) {
      setError('Utilisateur non authentifié. Redirection vers la connexion...');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }
    const messageData = {
      sender: currentUser.Identifiant,
      receiver: selectedUser.Identifiant,
      message: newMessage,
      type: 'text', // Indicate this is a text message
    };
    socket.emit('sendMessage', messageData, (response) => {
      if (response?.error) {
        setError(response.error);
      } else {
        setNewMessage('');
      }
    });
  };

  // Handle file selection and upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedUser) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      const fileUrl = response.data.fileUrl; // Assuming backend returns the file URL
      const fileName = file.name;

      // Send the file URL as a message
      const messageData = {
        sender: currentUser.Identifiant,
        receiver: selectedUser.Identifiant,
        message: fileUrl,
        fileName: fileName,
        type: 'file', // Indicate this is a file message
      };
      socket.emit('sendMessage', messageData, (response) => {
        if (response?.error) {
          setError(response.error);
        }
      });
    } catch (error) {
      setError(error.response?.data?.message || 'Erreur lors de l’envoi du fichier');
      console.error('Erreur upload fichier:', error);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.Name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Chargement des étudiants...</div>;
  if (error) return <div style={{ textAlign: 'center', padding: '20px', color: '#e74c3c' }}>{error}</div>;

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#f4f6f9',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Left Sidebar: User List */}
      <div style={{
        width: '320px',
        background: '#ffffff',
        boxShadow: '2px 0 10px rgba(0, 0, 0, 0.05)',
        padding: '20px',
        overflowY: 'auto',
        borderRight: '1px solid #e8ecef',
      }}>
        <div style={{
          position: 'relative',
          marginBottom: '20px',
        }}>
          <FiSearch style={{
            position: 'absolute',
            left: '15px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#adb5bd',
            fontSize: '18px',
          }} />
          <input
            type="text"
            placeholder="Rechercher un contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 20px 12px 40px',
              borderRadius: '12px',
              border: '1px solid #e8ecef',
              outline: 'none',
              fontSize: '14px',
              background: '#f8f9fa',
              transition: 'all 0.3s ease',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#007bff')}
            onBlur={(e) => (e.target.style.borderColor = '#e8ecef')}
          />
        </div>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {filteredUsers.map((user) => (
            <li
              key={user._id}
              onClick={() => openChat(user)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                margin: '5px 0',
                background: selectedUser?.Identifiant === user.Identifiant ? '#e7f1ff' : 'transparent',
                cursor: 'pointer',
                borderRadius: '10px',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = selectedUser?.Identifiant === user.Identifiant ? '#e7f1ff' : '#f1f3f5')}
              onMouseLeave={(e) => (e.currentTarget.style.background = selectedUser?.Identifiant === user.Identifiant ? '#e7f1ff' : 'transparent')}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#d1d8e0',
                marginRight: '12px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {onlineUsers.includes(user.Identifiant) && (
                  <span style={{
                    width: '16px',
                    height: '16px',
                    background: '#28a745',
                    borderRadius: '50%',
                    position: 'absolute',
                    bottom: '2px',
                    right: '2px',
                    border: '2px solid white',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{
                  margin: 0,
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#212529',
                }}>
                  {user.Name}
                </h4>
                <p style={{
                  margin: '2px 0 0',
                  fontSize: '13px',
                  color: '#6c757d',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {user.lastMessage || 'Aucun message récent'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Right Section: Chat Interface */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
      }}>
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div style={{
              padding: '15px 20px',
              borderBottom: '1px solid #e8ecef',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#ffffff',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#d1d8e0',
                  marginRight: '12px',
                  position: 'relative',
                }}>
                  {onlineUsers.includes(selectedUser.Identifiant) && (
                    <span style={{
                      width: '14px',
                      height: '14px',
                      background: '#28a745',
                      borderRadius: '50%',
                      position: 'absolute',
                      bottom: '2px',
                      right: '2px',
                      border: '2px solid white',
                    }} />
                  )}
                </div>
                <div>
                  <h3 style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#212529',
                  }}>
                    {selectedUser.Name}
                  </h3>
                  <p style={{
                    margin: '2px 0 0',
                    fontSize: '12px',
                    color: '#6c757d',
                  }}>
                    {onlineUsers.includes(selectedUser.Identifiant) ? 'En ligne' : 'Hors ligne'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: '#6c757d',
                  fontSize: '18px',
                  transition: 'color 0.2s ease',
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#007bff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#6c757d')}
                >
                  <FiSearch />
                </button>
                <button
                  onClick={() => fileInputRef.current.click()}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: '#6c757d',
                    fontSize: '18px',
                    transition: 'color 0.2s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#007bff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#6c757d')}
                >
                  <FiPaperclip />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
                <button style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: '#6c757d',
                  fontSize: '18px',
                  transition: 'color 0.2s ease',
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#007bff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#6c757d')}
                >
                  <FiMic />
                </button>
                <button style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: '#6c757d',
                  fontSize: '18px',
                  transition: 'color 0.2s ease',
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#007bff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#6c757d')}
                >
                  <FiVideo />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '20px',
              background: '#f8f9fa',
              backgroundImage: 'linear-gradient(to bottom, #f8f9fa, #f1f3f5)',
            }}>
              {messages.length === 0 ? (
                <p style={{
                  textAlign: 'center',
                  color: '#adb5bd',
                  fontSize: '14px',
                  marginTop: '50px',
                }}>
                  Aucun message pour l'instant
                </p>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    style={{
                      margin: '10px 0',
                      padding: '12px 16px',
                      borderRadius: '16px',
                      maxWidth: '70%',
                      position: 'relative',
                      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.05)',
                      transition: 'transform 0.1s ease',
                      ...(msg.sender === currentUser.Identifiant
                        ? {
                            background: 'linear-gradient(135deg, #007bff, #0056b3)',
                            color: 'white',
                            marginLeft: 'auto',
                          }
                        : {
                            background: '#ffffff',
                            color: '#212529',
                            marginRight: 'auto',
                            border: '1px solid #e8ecef',
                          }),
                    }}
                  >
                    {msg.type === 'file' ? (
                      <div>
                        <a
                          href={msg.message}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: msg.sender === currentUser.Identifiant ? '#ffffff' : '#007bff',
                            textDecoration: 'underline',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <FiPaperclip style={{ fontSize: '14px' }} />
                          {msg.fileName || 'Fichier'}
                        </a>
                        <span style={{
                          fontSize: '11px',
                          opacity: 0.7,
                          marginTop: '5px',
                          display: 'block',
                          textAlign: msg.sender === currentUser.Identifiant ? 'right' : 'left',
                        }}>
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ) : (
                      <>
                        <p style={{
                          margin: 0,
                          fontSize: '14px',
                          lineHeight: '1.5',
                          wordBreak: 'break-word',
                        }}>
                          {msg.message}
                        </p>
                        <span style={{
                          fontSize: '11px',
                          opacity: 0.7,
                          marginTop: '5px',
                          display: 'block',
                          textAlign: msg.sender === currentUser.Identifiant ? 'right' : 'left',
                        }}>
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div style={{
              padding: '15px 20px',
              borderTop: '1px solid #e8ecef',
              display: 'flex',
              gap: '10px',
              background: '#ffffff',
              boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.03)',
            }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Écrire un message..."
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: '25px',
                  border: '1px solid #e8ecef',
                  outline: 'none',
                  fontSize: '14px',
                  background: '#f8f9fa',
                  transition: 'border-color 0.3s ease',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#007bff')}
                onBlur={(e) => (e.target.style.borderColor = '#e8ecef')}
              />
              <button
                onClick={handleSendMessage}
                style={{
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, #007bff, #0056b3)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'transform 0.1s ease, background 0.3s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <FiSend /> Envoyer
              </button>
            </div>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#adb5bd',
            fontSize: '16px',
            background: '#f8f9fa',
          }}>
            Sélectionnez un contact pour commencer une discussion
          </div>
        )}
      </div>
    </div>
  );
};

export default UserList;