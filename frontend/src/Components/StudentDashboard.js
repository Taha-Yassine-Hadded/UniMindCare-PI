import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitExitRequest } from '../Services/api';

function StudentDashboard({ token: propToken }) {
  const navigate = useNavigate();
  const token = propToken || localStorage.getItem('token') || sessionStorage.getItem('token');
  console.log("Token dans StudentDashboard:", token);

  const [reason, setReason] = useState('');
  const [chatMessages, setChatMessages] = useState([]); // Historique du chat
  const [message, setMessage] = useState('');

  if (!token) {
    navigate('/login');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Données envoyées:', { reason });
    try {
      // Envoyer la demande sans teacherId (le backend le détermine)
      const response = await submitExitRequest({ reason }, token);
      // Ajouter le message de l'étudiant au chat
      setChatMessages((prev) => [...prev, { sender: 'Moi', text: reason }]);
      // Ajouter la réponse du "chat" (simulée ici, mais viendra du backend)
      setChatMessages((prev) => [...prev, { sender: 'Classe', text: response.message }]);
      setReason('');
      setMessage(response.message);
    } catch (error) {
      console.error('Erreur complète:', error.response?.data);
      const errorMsg = error.response?.data?.message || error.response?.data?.errors?.map(e => e.msg).join(', ') || 'Erreur lors de la soumission';
      setMessage(errorMsg);
      setChatMessages((prev) => [...prev, { sender: 'Classe', text: errorMsg }]);
    }
  };

  return (
    <div>
      <h2>Tableau de bord étudiant</h2>
      <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '10px', maxHeight: '300px', overflowY: 'auto' }}>
        <h3>Conversation de classe</h3>
        {chatMessages.map((msg, index) => (
          <p key={index} style={{ margin: '5px 0' }}>
            <strong>{msg.sender}:</strong> {msg.text}
          </p>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Raison de la sortie :</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            placeholder="Ex: toilette, urgence..."
          />
        </div>
        <button type="submit">Envoyer dans le chat</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

export default StudentDashboard;