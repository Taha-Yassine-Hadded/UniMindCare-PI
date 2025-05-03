import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { FiSearch, FiPaperclip, FiMic, FiMicOff, FiVideo, FiSend, FiX, FiSun, FiMoon } from 'react-icons/fi';

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
  const [unreadCounts, setUnreadCounts] = useState({});
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light'); // Thème par défaut : clair, avec persistance
  const mediaRecorderRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);

  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
  const currentUser = storedUser ? JSON.parse(storedUser) : {};

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme); // Sauvegarde du thème dans localStorage
  };

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
      console.log('Message reçu:', message);
      setMessages((prev) => {
        if (!prev.some((m) => m._id === message._id)) {
          return [...prev, message];
        }
        return prev;
      });
      setFilteredMessages((prev) => {
        if (!prev.some((m) => m._id === message._id)) {
          return [...prev, message];
        }
        return prev;
      });
    });

    socketInstance.on('unreadCount', ({ sender, count }) => {
      console.log(`Nombre de messages non lus de ${sender}: ${count}`);
      setUnreadCounts((prev) => ({
        ...prev,
        [sender]: count,
      }));
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
        console.log('Utilisateurs récupérés:', res.data);
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
      socketInstance.off('unreadCount');
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
        console.log('Messages récupérés:', response.data);
        setMessages(response.data);
        setFilteredMessages(response.data);

        if (socket) {
          socket.emit('markAsRead', {
            sender: selectedUser.Identifiant,
            receiver: currentUser.Identifiant,
          }, async () => {
            const updatedResponse = await axios.get(
              `http://localhost:5000/messages/${currentUser.Identifiant}/${selectedUser.Identifiant}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessages(updatedResponse.data);
            setFilteredMessages(updatedResponse.data);
          });
        }
      } catch (error) {
        setError(error.response?.data?.message || 'Erreur lors du chargement des messages');
      }
    };
    fetchMessages();
  }, [selectedUser, currentUser.Identifiant, token, socket]);

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

  if (loading) return <div className={`loading ${theme}`}>Chargement des utilisateurs...</div>;
  if (error) return <div className={`error ${theme}`}>{error}</div>;

  return (
    <div className={`chat-container ${theme}`}>
      <style>
        {`
          .chat-container {
            display: flex;
            height: 100vh;
            font-family: "'Inter', sans-serif";
            transition: background 0.5s ease, color 0.5s ease;
          }
          .chat-container.light {
            background: #f4f6f9;
          }
          .chat-container.dark {
            background: #1e2126;
          }
          .loading, .error {
            text-align: center;
            padding: 20px;
          }
          .loading.light, .error.light {
            color: #666;
            background: #f4f6f9;
          }
          .loading.dark, .error.dark {
            color: #b0b8c4;
            background: #1e2126;
          }
          .error.light {
            color: #e74c3c;
          }
          .error.dark {
            color: #ff6b6b;
          }
          .sidebar {
            width: 320px;
            padding: 20px;
            overflow-y: auto;
            transition: background 0.5s ease, color 0.5s ease;
          }
          .sidebar.light {
            background: #ffffff;
            box-shadow: 2px 0 10px rgba(0, 0, 0, 0.05);
            border-right: 1px solid #e8ecef;
          }
          .sidebar.dark {
            background: #2c2f36;
            box-shadow: 2px 0 10px rgba(0, 0, 0, 0.2);
            border-right: 1px solid #3a3f47;
          }
          .search-container {
            position: relative;
            margin-bottom: 20px;
          }
          .search-icon {
            position: absolute;
            left: 15px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 18px;
            transition: color 0.3s ease;
          }
          .search-icon.light {
            color: #adb5bd;
          }
          .search-icon.dark {
            color: #b0b8c4;
          }
          .search-input {
            width: 100%;
            padding: 12px 20px 12px 40px;
            border-radius: 12px;
            outline: none;
            font-size: 14px;
            transition: all 0.3s ease;
          }
          .search-input.light {
            border: 1px solid #e8ecef;
            background: #f8f9fa;
          }
          .search-input.dark {
            border: 1px solid #3a3f47;
            background: #3a3f47;
            color: #e0e0e0;
          }
          .search-input:focus.light {
            border-color: #007bff;
          }
          .search-input:focus.dark {
            border-color: #3498db;
          }
          .user-list {
            list-style: none;
            padding: 0;
          }
          .user-item {
            display: flex;
            align-items: center;
            padding: 12px;
            margin: 5px 0;
            cursor: pointer;
            border-radius: 10px;
            transition: background 0.2s ease;
          }
          .user-item.light:hover {
            background: #f1f3f5;
          }
          .user-item.dark:hover {
            background: #3a3f47;
          }
          .user-item.selected.light {
            background: #e7f1ff;
          }
          .user-item.selected.dark {
            background: #3a3f47;
          }
          .avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            position: relative;
            overflow: hidden;
            margin-right: 12px;
            transition: background 0.5s ease;
          }
          .avatar.light {
            background: #d1d8e0;
          }
          .avatar.dark {
            background: #4a5059;
          }
          .online-indicator {
            width: 16px;
            height: 16px;
            background: #28a745;
            border-radius: 50%;
            position: absolute;
            bottom: 2px;
            right: 2px;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .user-info {
            flex: 1;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .user-name {
            margin: 0;
            font-size: 15px;
            font-weight: 600;
            transition: color 0.5s ease;
          }
          .user-name.light {
            color: #212529;
          }
          .user-name.dark {
            color: #e0e0e0;
          }
          .last-message {
            margin: 2px 0 0;
            font-size: 13px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            transition: color 0.5s ease;
          }
          .last-message.light {
            color: #6c757d;
          }
          .last-message.dark {
            color: #b0b8c4;
          }
          .unread-badge {
            background: #dc3545;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
          }
          .chat-area {
            flex: 1;
            display: flex;
            flex-direction: column;
            transition: background 0.5s ease;
          }
          .chat-area.light {
            background: #ffffff;
          }
          .chat-area.dark {
            background: #2c2f36;
          }
          .chat-header {
            padding: 15px 20px;
            border-bottom: 1px solid;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
            transition: background 0.5s ease, border-color 0.5s ease;
          }
          .chat-header.light {
            background: #ffffff;
            border-bottom-color: #e8ecef;
          }
          .chat-header.dark {
            background: #2c2f36;
            border-bottom-color: #3a3f47;
          }
          .header-content {
            display: flex;
            align-items: center;
            flex: 1;
          }
          .header-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            margin-right: 12px;
            position: relative;
            transition: background 0.5s ease;
          }
          .header-avatar.light {
            background: #d1d8e0;
          }
          .header-avatar.dark {
            background: #4a5059;
          }
          .header-online-indicator {
            width: 14px;
            height: 14px;
            background: #28a745;
            border-radius: 50%;
            position: absolute;
            bottom: 2px;
            right: 2px;
            border: 2px solid white;
          }
          .header-info {
            flex: 1;
          }
          .search-message-container {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .search-message-input {
            flex: 1;
            padding: 8px 12px;
            border-radius: 20px;
            outline: none;
            font-size: 14px;
            transition: border-color 0.3s ease, background 0.5s ease, color 0.5s ease;
          }
          .search-message-input.light {
            border: 1px solid #e8ecef;
            background: #f8f9fa;
            color: #212529;
          }
          .search-message-input.dark {
            border: 1px solid #3a3f47;
            background: #3a3f47;
            color: #e0e0e0;
          }
          .close-search-button {
            border: none;
            background: none;
            cursor: pointer;
            font-size: 18px;
            transition: color 0.3s ease;
          }
          .close-search-button.light {
            color: #dc3545;
          }
          .close-search-button.dark {
            color: #ff6b6b;
          }
          .chat-title {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            transition: color 0.5s ease;
          }
          .chat-title.light {
            color: #212529;
          }
          .chat-title.dark {
            color: #e0e0e0;
          }
          .chat-status {
            margin: 2px 0 0;
            font-size: 12px;
            transition: color 0.5s ease;
          }
          .chat-status.light {
            color: #6c757d;
          }
          .chat-status.dark {
            color: #b0b8c4;
          }
          .header-buttons {
            display: flex;
            gap: 10px;
          }
          .theme-toggle {
            border: none;
            background: none;
            cursor: pointer;
            font-size: 18px;
            transition: color 0.3s ease;
          }
          .theme-toggle.light {
            color: #6c757d;
          }
          .theme-toggle.dark {
            color: #b0b8c4;
          }
          .theme-toggle:hover.light {
            color: #007bff;
          }
          .theme-toggle:hover.dark {
            color: #3498db;
          }
          .header-button {
            border: none;
            background: none;
            cursor: pointer;
            font-size: 18px;
            transition: color 0.2s ease;
          }
          .header-button.light {
            color: #6c757d;
          }
          .header-button.dark {
            color: #b0b8c4;
          }
          .header-button:hover.light {
            color: #007bff;
          }
          .header-button:hover.dark {
            color: #3498db;
          }
          .header-button.active.light {
            color: #007bff;
          }
          .header-button.active.dark {
            color: #3498db;
          }
          .header-button.recording.light {
            color: #dc3545;
          }
          .header-button.recording.dark {
            color: #ff6b6b;
          }
          .messages-area {
            flex: 1;
            overflow: auto;
            padding: 20px;
            background-image: linear-gradient(to bottom, #f8f9fa, #f1f3f5);
            transition: background 0.5s ease;
          }
          .messages-area.light {
            background-image: linear-gradient(to bottom, #f8f9fa, #f1f3f5);
          }
          .messages-area.dark {
            background-image: linear-gradient(to bottom, #2c2f36, #1e2126);
          }
          .no-messages {
            text-align: center;
            font-size: 14px;
            margin-top: 50px;
            transition: color 0.5s ease;
          }
          .no-messages.light {
            color: #adb5bd;
          }
          .no-messages.dark {
            color: #b0b8c4;
          }
          .message {
            margin: 10px 0;
            padding: 12px 16px;
            border-radius: 16px;
            max-width: 70%;
            position: relative;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
            transition: transform 0.1s ease, background 0.5s ease, color 0.5s ease;
          }
          .message.sent.light {
            background: linear-gradient(135deg, #007bff, #0056b3);
            color: white;
            margin-left: auto;
          }
          .message.sent.dark {
            background: linear-gradient(135deg, #3498db, #1f6b8a);
            color: #e0e0e0;
            margin-left: auto;
          }
          .message.received.light {
            background: #ffffff;
            color: #212529;
            margin-right: auto;
            border: 1px solid #e8ecef;
          }
          .message.received.dark {
            background: #3a3f47;
            color: #e0e0e0;
            margin-right: auto;
            border: 1px solid #4a5059;
          }
          .message.unread.light {
            color: black;
            font-weight: bold;
          }
          .message.unread.dark {
            color: #e0e0e0;
            font-weight: bold;
          }
          .message-content {
            margin: 0;
            font-size: 14px;
            line-height: 1.5;
            word-break: break-word;
          }
          .message-time {
            font-size: 11px;
            opacity: 0.7;
            margin-top: 5px;
            display: block;
          }
          .message-link {
            text-decoration: underline;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 5px;
            transition: color 0.5s ease;
          }
          .message-link.sent.light {
            color: #ffffff;
          }
          .message-link.sent.dark {
            color: #e0e0e0;
          }
          .message-link.received.light {
            color: #007bff;
          }
          .message-link.received.dark {
            color: #3498db;
          }
          .message-audio {
            width: 100%;
            max-width: 250px;
            margin-bottom: 5px;
          }
          .input-area {
            padding: 15px 20px;
            border-top: 1px solid;
            display: flex;
            gap: 10px;
            box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.03);
            transition: background 0.5s ease, border-color 0.5s ease;
          }
          .input-area.light {
            background: #ffffff;
            border-top-color: #e8ecef;
          }
          .input-area.dark {
            background: #2c2f36;
            border-top-color: #3a3f47;
          }
          .message-input {
            flex: 1;
            padding: 12px 20px;
            border-radius: 25px;
            outline: none;
            font-size: 14px;
            transition: border-color 0.3s ease, background 0.5s ease, color 0.5s ease;
          }
          .message-input.light {
            border: 1px solid #e8ecef;
            background: #f8f9fa;
            color: #212529;
          }
          .message-input.dark {
            border: 1px solid #3a3f47;
            background: #3a3f47;
            color: #e0e0e0;
          }
          .message-input:focus.light {
            border-color: #007bff;
          }
          .message-input:focus.dark {
            border-color: #3498db;
          }
          .send-button {
            padding: 12px 20px;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 14px;
            font-weight: 500;
            transition: transform 0.1s ease, background 0.3s ease;
          }
          .send-button.light {
            background: linear-gradient(135deg, #007bff, #0056b3);
            color: white;
          }
          .send-button.dark {
            background: linear-gradient(135deg, #3498db, #1f6b8a);
            color: #e0e0e0;
          }
          .send-button:hover {
            transform: scale(1.05);
          }
          .no-chat-selected {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 16px;
            transition: background 0.5s ease, color 0.5s ease;
          }
          .no-chat-selected.light {
            background: #f8f9fa;
            color: #adb5bd;
          }
          .no-chat-selected.dark {
            background: #1e2126;
            color: #b0b8c4;
          }
          .video-call-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
          }
          .video-call-content {
            border-radius: 10px;
            padding: 20px;
            width: 90%;
            max-width: 800px;
            position: relative;
            transition: background 0.5s ease, color 0.5s ease;
          }
          .video-call-content.light {
            background: #fff;
            color: #212529;
          }
          .video-call-content.dark {
            background: #2c2f36;
            color: #e0e0e0;
          }
          .video-call-title {
            margin: 0 0 20px;
            text-align: center;
          }
          .video-container {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
          }
          .video {
            width: 50%;
            border-radius: 8px;
            background: #000;
            transition: border-color 0.5s ease;
          }
          .video.light {
            border: 1px solid #e8ecef;
          }
          .video.dark {
            border: 1px solid #3a3f47;
          }
          .end-call-button {
            display: block;
            margin: 0 auto;
            padding: 10px 20px;
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 20px;
            cursor: pointer;
            font-size: 14px;
          }
          .incoming-call-modal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
            z-index: 1000;
            transition: background 0.5s ease, color 0.5s ease;
          }
          .incoming-call-modal.light {
            background: #fff;
            color: #212529;
          }
          .incoming-call-modal.dark {
            background: #2c2f36;
            color: #e0e0e0;
          }
          .incoming-call-title {
            margin: 0 0 20px;
            text-align: center;
          }
          .incoming-call-buttons {
            display: flex;
            gap: 10px;
            justify-content: center;
          }
          .accept-call-button {
            padding: 10px 20px;
            background: #28a745;
            color: white;
            border: none;
            border-radius: 20px;
            cursor: pointer;
            font-size: 14px;
          }
          .reject-call-button {
            padding: 10px 20px;
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 20px;
            cursor: pointer;
            font-size: 14px;
          }
        `}
      </style>
      <div className="sidebar">
        <div className="search-container">
          <FiSearch className={`search-icon ${theme}`} />
          <input
            type="text"
            placeholder="Rechercher un contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`search-input ${theme}`}
          />
        </div>
        <ul className="user-list">
          {filteredUsers.map((user) => (
            <li
              key={user._id}
              onClick={() => openChat(user)}
              className={`user-item ${selectedUser?.Identifiant === user.Identifiant ? 'selected' : ''} ${theme}`}
            >
              <div className={`avatar ${theme}`}>
                {onlineUsers.includes(user.Identifiant) && (
                  <span className="online-indicator" />
                )}
              </div>
              <div className="user-info">
                <div>
                  <h4 className={`user-name ${theme}`}>
                    {user.Name}
                  </h4>
                  <p className={`last-message ${theme}`}>
                    {user.lastMessage || 'Aucun message récent'}
                  </p>
                </div>
                {unreadCounts[user.Identifiant] > 0 && (
                  <span className="unread-badge">
                    {unreadCounts[user.Identifiant]}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="chat-area">
        {selectedUser ? (
          <>
            <div className={`chat-header ${theme}`}>
              <div className="header-content">
                <div className={`header-avatar ${theme}`}>
                  {onlineUsers.includes(selectedUser.Identifiant) && (
                    <span className="header-online-indicator" />
                  )}
                </div>
                <div className="header-info">
                  {isSearchActive ? (
                    <div className="search-message-container">
                      <input
                        type="text"
                        value={searchMessageQuery}
                        onChange={(e) => setSearchMessageQuery(e.target.value)}
                        placeholder="Rechercher dans la conversation..."
                        className={`search-message-input ${theme}`}
                        autoFocus
                      />
                      <button
                        onClick={toggleSearch}
                        className={`close-search-button ${theme}`}
                      >
                        <FiX />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3 className={`chat-title ${theme}`}>
                        {selectedUser.Name}
                      </h3>
                      <p className={`chat-status ${theme}`}>
                        {onlineUsers.includes(selectedUser.Identifiant) ? 'En ligne' : 'Hors ligne'}
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="header-buttons">
                <button
                  onClick={toggleSearch}
                  className={`header-button ${isSearchActive ? 'active' : ''} ${theme}`}
                >
                  <FiSearch />
                </button>
                <button
                  onClick={toggleTheme}
                  className={`theme-toggle ${theme}`}
                  title={theme === 'light' ? 'Passer au thème sombre' : 'Passer au thème clair'}
                >
                  {theme === 'light' ? <FiMoon /> : <FiSun />}
                </button>
                <button
                  onClick={() => fileInputRef.current.click()}
                  className={`header-button ${theme}`}
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
                  className={`header-button ${isRecording ? 'recording' : ''} ${theme}`}
                >
                  {isRecording ? <FiMicOff /> : <FiMic />}
                </button>
                <button
                  onClick={startVideoCall}
                  className={`header-button ${theme}`}
                >
                  <FiVideo />
                </button>
              </div>
            </div>

            <div className={`messages-area ${theme}`}>
              {filteredMessages.length === 0 ? (
                <p className={`no-messages ${theme}`}>
                  {searchMessageQuery ? 'Aucun message correspondant' : 'Aucun message pour l\'instant'}
                </p>
              ) : (
                filteredMessages.map((msg, index) => {
                  console.log(`Message ${index}: read = ${msg.read}`);
                  return (
                    <div
                      key={index}
                      className={`message ${msg.sender === currentUser.Identifiant ? 'sent' : 'received'} ${msg.read === false && msg.sender !== currentUser.Identifiant ? 'unread' : ''} ${theme}`}
                    >
                      {msg.type === 'text' ? (
                        <>
                          <p className="message-content">
                            {msg.message}
                          </p>
                          <span className="message-time" style={{ textAlign: msg.sender === currentUser.Identifiant ? 'right' : 'left' }}>
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
                            className={`message-link ${msg.sender === currentUser.Identifiant ? 'sent' : 'received'} ${theme}`}
                          >
                            <FiPaperclip style={{ fontSize: '14px' }} />
                            {msg.fileName || 'Fichier'}
                          </a>
                          <span className="message-time" style={{ textAlign: msg.sender === currentUser.Identifiant ? 'right' : 'left' }}>
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
                            className="message-audio"
                          />
                          <span className="message-time" style={{ textAlign: msg.sender === currentUser.Identifiant ? 'right' : 'left' }}>
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className={`input-area ${theme}`}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Écrire un message..."
                className={`message-input ${theme}`}
              />
              <button
                onClick={handleSendMessage}
                className={`send-button ${theme}`}
              >
                <FiSend /> Envoyer
              </button>
            </div>
          </>
        ) : (
          <div className={`no-chat-selected ${theme}`}>
            Sélectionnez un contact pour commencer une discussion
          </div>
        )}
      </div>

      {isVideoCallActive && selectedUser && (
        <div className="video-call-modal">
          <div className={`video-call-content ${theme}`}>
            <h3 className="video-call-title">Appel vidéo avec {selectedUser.Name}</h3>
            <div className="video-container">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                className={`video ${theme}`}
              />
              <video
                ref={remoteVideoRef}
                autoPlay
                className={`video ${theme}`}
              />
            </div>
            <button
              onClick={endCall}
              className="end-call-button"
            >
              Terminer l’appel
            </button>
          </div>
        </div>
      )}

      {incomingCall && selectedUser && (
        <div className={`incoming-call-modal ${theme}`}>
          <h3 className="incoming-call-title">Appel entrant de {selectedUser.Name}</h3>
          <div className="incoming-call-buttons">
            <button
              onClick={acceptCall}
              className="accept-call-button"
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
              className="reject-call-button"
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