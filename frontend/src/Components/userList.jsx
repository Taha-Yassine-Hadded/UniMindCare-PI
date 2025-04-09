import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ChatModal from './ChatModal';

const UserList = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const token = localStorage.getItem('token') || sessionStorage.getItem('token');

  useEffect(() => {
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
  }, [token, navigate]);

  const openChat = (user) => {
    console.log('Utilisateur sélectionné pour chat:', user);
    setSelectedUser({
      Identifiant: user.Identifiant || user._id, // Si Identifiant n'est pas dans la réponse, utiliser _id temporairement
      Name: user.Name,
      Email: user.Email,
    });
    setIsChatOpen(true);
  };

  const closeChat = () => {
    setIsChatOpen(false);
    setSelectedUser(null);
  };

  if (loading) return <div>Chargement des étudiants...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>Liste des étudiants</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {users.map((user) => (
          <li
            key={user._id}
            onClick={() => openChat(user)}
            style={{
              padding: '10px',
              margin: '5px 0',
              background: '#f0f0f0',
              cursor: 'pointer',
            }}
          >
            {user.Name} ({user.Email})
          </li>
        ))}
      </ul>
      {isChatOpen && selectedUser && (
        <ChatModal receiverUser={selectedUser} onClose={closeChat} />
      )}
    </div>
  );
};

export default UserList;