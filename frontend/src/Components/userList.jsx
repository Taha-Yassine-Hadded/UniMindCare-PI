import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { FiSearch, FiPaperclip, FiMic, FiMicOff, FiVideo, FiSend, FiX } from 'react-icons/fi';

const UserList = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMessageQuery, setSearchMessageQuery] = useState('');
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const mediaRecorderRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);

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
      setOnlineUsers(onlineUsersList);
    });

    socketInstance.on('connect_error', (err) => {
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

    socketInstance.on('startVideoCall', ({ from }) => {
      if (selectedUser && selectedUser.Identifiant === from) {
        setIncomingCall({ from });
      }
    });

    socketInstance.on('offer', async ({ offer, from }) => {
      if (!peerConnectionRef.current) {
        createPeerConnection();
      }
      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        socketInstance.emit('answer', {
          answer,
          to: from,
          from: currentUser.Identifiant,
        });
        setIsVideoCallActive(true);
      } catch (error) {
        setError('Erreur lors de la gestion de l’offre');
      }
    });

    socketInstance.on('answer', async ({ answer }) => {
      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        setError('Erreur lors de la gestion de la réponse');
      }
    });

    socketInstance.on('ice-candidate', async ({ candidate }) => {
      try {
        if (candidate && peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (error) {
        setError('Erreur lors de la gestion du candidat ICE');
      }
    });

    socketInstance.on('endCall', () => {
      endCall();
    });

    const fetchUsers = async () => {
      try {
        if (!token) {
          setError('Utilisateur non authentifié. Redirection vers la connexion...');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }
        const res = await axios.get('http://localhost:5000/api/users/all', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Utilisateurs récupérés:', res.data); // Debug
        setUsers(res.data);
      } catch (error) {
        setError(error.response?.data?.message || 'Erreur lors du chargement des utilisateurs');
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
      socketInstance.off('startVideoCall');
      socketInstance.off('offer');
      socketInstance.off('answer');
      socketInstance.off('ice-candidate');
      socketInstance.off('endCall');
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
        setFilteredMessages(response.data); // Initialize filtered messages with all messages
      } catch (error) {
        setError(error.response?.data?.message || 'Erreur lors du chargement des messages');
      }
    };
    fetchMessages();
  }, [selectedUser, currentUser.Identifiant, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, filteredMessages]);

  useEffect(() => {
    if (!searchMessageQuery.trim()) {
      setFilteredMessages(messages);
      return;
    }

    const query = searchMessageQuery.toLowerCase();
    const filtered = messages.filter((msg) =>
      msg.type === 'text' && msg.message.toLowerCase().includes(query)
    );
    setFilteredMessages(filtered);
  }, [searchMessageQuery, messages]);

  const createPeerConnection = () => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    peerConnectionRef.current = peerConnection;

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          to: selectedUser?.Identifiant,
          from: currentUser.Identifiant,
        });
      }
    };

    peerConnection.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      if (peerConnection.iceConnectionState === 'disconnected' || peerConnection.iceConnectionState === 'closed') {
        endCall();
      }
    };

    return peerConnection;
  };

  const startVideoCall = async () => {
    if (!selectedUser || !onlineUsers.includes(selectedUser.Identifiant)) {
      setError('L’utilisateur n’est pas en ligne');
      return;
    }
    if (!socket) {
      setError('Connexion au serveur non établie');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const peerConnection = createPeerConnection();
      stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit('startVideoCall', {
        to: selectedUser.Identifiant,
        from: currentUser.Identifiant,
      });

      socket.emit('offer', {
        offer,
        to: selectedUser.Identifiant,
        from: currentUser.Identifiant,
      });

      setIsVideoCallActive(true);
    } catch (error) {
      setError('Erreur lors du démarrage de l’appel vidéo');
    }
  };

  const acceptCall = async () => {
    if (!incomingCall || !selectedUser || !socket) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const peerConnection = createPeerConnection();
      stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

      setIncomingCall(null);
      setIsVideoCallActive(true);
    } catch (error) {
      setError('Erreur lors de l’acceptation de l’appel');
    }
  };

  const endCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setIsVideoCallActive(false);
    setIncomingCall(null);
    if (socket && selectedUser) {
      socket.emit('endCall', { to: selectedUser.Identifiant });
    }
  };

  const openChat = (user) => {
    if (!user.Identifiant) return;
    setSelectedUser({
      Identifiant: user.Identifiant,
      Name: user.Name,
      Email: user.Email,
    });
    setMessages([]);
    setFilteredMessages([]);
    setSearchMessageQuery('');
    setIsSearchActive(false);
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
      type: 'text',
    };
    socket?.emit('sendMessage', messageData, (response) => {
      if (response?.error) {
        setError(response.error);
      } else {
        setNewMessage('');
      }
    });
  };

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

      const fileUrl = response.data.fileUrl;
      const fileName = file.name;

      const messageData = {
        sender: currentUser.Identifiant,
        receiver: selectedUser.Identifiant,
        message: fileUrl,
        fileName: fileName,
        type: 'file',
      };
      socket?.emit('sendMessage', messageData, (response) => {
        if (response?.error) {
          setError(response.error);
        }
      });
    } catch (error) {
      setError(error.response?.data?.message || 'Erreur lors de l’envoi du fichier');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      setError('Erreur lors de l’accès au microphone');
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (audioBlob && selectedUser) {
        const formData = new FormData();
        formData.append('file', audioBlob, `voice-message-${Date.now()}.webm`);

        try {
          const response = await axios.post('http://localhost:5000/api/upload', formData, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          });

          const fileUrl = response.data.fileUrl;
          const fileName = `voice-message-${Date.now()}.webm`;

          const messageData = {
            sender: currentUser.Identifiant,
            receiver: selectedUser.Identifiant,
            message: fileUrl,
            fileName: fileName,
            type: 'audio',
          };
          socket?.emit('sendMessage', messageData, (response) => {
            if (response?.error) {
              setError(response.error);
            }
            setAudioBlob(null);
          });
        } catch (error) {
          setError(error.response?.data?.message || 'Erreur lors de l’envoi du message vocal');
        }
      }
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const toggleSearch = () => {
    setIsSearchActive((prev) => !prev);
    if (isSearchActive) {
      setSearchMessageQuery('');
      setFilteredMessages(messages);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.Name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Chargement des utilisateurs...</div>;
  if (error) return <div style={{ textAlign: 'center', padding: '20px', color: '#e74c3c' }}>{error}</div>;

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#f4f6f9',
      fontFamily: "'Inter', sans-serif",
    }}>
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

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
      }}>
        {selectedUser ? (
          <>
            <div style={{
              padding: '15px 20px',
              borderBottom: '1px solid #e8ecef',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#ffffff',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
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
                <div style={{ flex: 1 }}>
                  {isSearchActive ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="text"
                        value={searchMessageQuery}
                        onChange={(e) => setSearchMessageQuery(e.target.value)}
                        placeholder="Rechercher dans la conversation..."
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '20px',
                          border: '1px solid #e8ecef',
                          outline: 'none',
                          fontSize: '14px',
                          background: '#f8f9fa',
                        }}
                        autoFocus
                      />
                      <button
                        onClick={toggleSearch}
                        style={{
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          color: '#dc3545',
                          fontSize: '18px',
                        }}
                      >
                        <FiX />
                      </button>
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={toggleSearch}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: isSearchActive ? '#007bff' : '#6c757d',
                    fontSize: '18px',
                    transition: 'color 0.2s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#007bff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = isSearchActive ? '#007bff' : '#6c757d')}
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
                <button
                  onClick={handleMicClick}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: isRecording ? '#dc3545' : '#6c757d',
                    fontSize: '18px',
                    transition: 'color 0.2s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = isRecording ? '#dc3545' : '#007bff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = isRecording ? '#dc3545' : '#6c757d')}
                >
                  {isRecording ? <FiMicOff /> : <FiMic />}
                </button>
                <button
                  onClick={startVideoCall}
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
                  <FiVideo />
                </button>
              </div>
            </div>

            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '20px',
              background: '#f8f9fa',
              backgroundImage: 'linear-gradient(to bottom, #f8f9fa, #f1f3f5)',
            }}>
              {filteredMessages.length === 0 ? (
                <p style={{
                  textAlign: 'center',
                  color: '#adb5bd',
                  fontSize: '14px',
                  marginTop: '50px',
                }}>
                  {searchMessageQuery ? 'Aucun message correspondant' : 'Aucun message pour l\'instant'}
                </p>
              ) : (
                filteredMessages.map((msg, index) => (
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
                    {msg.type === 'text' ? (
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
                    ) : msg.type === 'file' ? (
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
                    ) : msg.type === 'audio' ? (
                      <div>
                        <audio
                          controls
                          src={msg.message}
                          style={{
                            width: '100%',
                            maxWidth: '250px',
                            marginBottom: '5px',
                          }}
                        />
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
                    ) : null}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

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

      {isVideoCallActive && selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '10px',
            padding: '20px',
            width: '90%',
            maxWidth: '800px',
            position: 'relative',
          }}>
            <h3 style={{ margin: '0 0 20px', textAlign: 'center' }}>Appel vidéo avec {selectedUser.Name}</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                style={{
                  width: '50%',
                  borderRadius: '8px',
                  border: '1px solid #e8ecef',
                  background: '#000',
                }}
              />
              <video
                ref={remoteVideoRef}
                autoPlay
                style={{
                  width: '50%',
                  borderRadius: '8px',
                  border: '1px solid #e8ecef',
                  background: '#000',
                }}
              />
            </div>
            <button
              onClick={endCall}
              style={{
                display: 'block',
                margin: '0 auto',
                padding: '10px 20px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Terminer l’appel
            </button>
          </div>
        </div>
      )}

      {incomingCall && selectedUser && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#fff',
          borderRadius: '10px',
          padding: '20px',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
          zIndex: 1000,
        }}>
          <h3 style={{ margin: '0 0 20px', textAlign: 'center' }}>Appel entrant de {selectedUser.Name}</h3>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={acceptCall}
              style={{
                padding: '10px 20px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Accepter
            </button>
            <button
              onClick={() => {
                if (socket) {
                  socket.emit('endCall', { to: incomingCall.from });
                }
                setIncomingCall(null);
              }}
              style={{
                padding: '10px 20px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Refuser
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;