import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitExitRequest } from '../Services/api';

function StudentsDashboard({ token: propToken }) {
  const navigate = useNavigate();
  const token = propToken || localStorage.getItem('token') || sessionStorage.getItem('token');
  console.log("Token dans StudentDashboard:", token);

  const [reason, setReason] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [queue, setQueue] = useState([]); // État pour la file d'attente

  // Nom de l'utilisateur connecté (à remplacer par la vraie valeur, par exemple depuis le token ou une API)
  const currentUser = "NOM_UTILISATEUR"; // Remplacez par une récupération dynamique, ex: depuis une API ou le token

  // Récupération de la file d'attente toutes les 5 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/queue', {
        headers: {
          Authorization: `Bearer ${token}`, // Ajout du token pour authentification
        },
      })
        .then(res => res.json())
        .then(data => setQueue(data.queue || [])) // Mise à jour de la file
        .catch(err => console.error("Erreur lors de la récupération de la file:", err));
    }, 5000);

    // Nettoyage de l'intervalle lors du démontage du composant
    return () => clearInterval(interval);
  }, [token]);

  // Calcul de la position de l'utilisateur dans la file
  const myPosition = queue.findIndex(q => q.student_name === currentUser) + 1;

  if (!token) {
    navigate('/login');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await submitExitRequest({ reason }, token);
      setChatMessages((prev) => [...prev, { sender: 'Moi', text: reason }]);
      setChatMessages((prev) => [...prev, { sender: 'Classe', text: response.message }]);
      setReason('');
      setMessage(response.message);
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.response?.data?.errors?.map(e => e.msg).join(', ') ||
        'Erreur lors de la soumission';
      setMessage(errorMsg);
      setChatMessages((prev) => [...prev, { sender: 'Classe', text: errorMsg }]);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🎓 Tableau de bord étudiant</h2>

      {/* Affichage de la position dans la file */}
      <div style={styles.queueInfo}>
        <h3 style={styles.queueTitle}>📋 File d'attente</h3>
        <p style={styles.queuePosition}>
          {myPosition > 0
            ? `Votre position dans la file : ${myPosition}`
            : "Vous n'êtes pas dans la file d'attente."}
        </p>
      </div>

      <div style={styles.chatBox}>
        <h3 style={styles.chatTitle}>💬 Conversation de classe</h3>
        <div style={styles.chatMessages}>
          {chatMessages.map((msg, index) => (
            <p key={index} style={{ margin: '5px 0' }}>
              <strong>{msg.sender}:</strong> {msg.text}
            </p>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>Raison de la sortie :</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          placeholder="Ex: toilette, urgence..."
          style={styles.input}
        />
        <button type="submit" style={styles.button}>Envoyer dans le chat</button>
      </form>

      {message && <p style={styles.feedback}>{message}</p>}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '600px',
    margin: '60px auto',
    padding: '30px',
    backgroundColor: '#fefefe',
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    fontFamily: 'Arial, sans-serif',
    color: '#1f1f1f',
    background: 'linear-gradient(to bottom right, #e0f7ff, #fffde7)', // bleu clair → jaune pâle
  },
  title: {
    color: '#003f5c',
    textAlign: 'center',
    marginBottom: '20px',
  },
  queueInfo: {
    backgroundColor: '#ffffffcc',
    border: '1px solid #28a745',
    borderRadius: '12px',
    padding: '15px',
    marginBottom: '20px',
  },
  queueTitle: {
    marginBottom: '10px',
    color: '#28a745',
  },
  queuePosition: {
    fontSize: '16px',
    color: '#003f5c',
  },
  chatBox: {
    backgroundColor: '#ffffffcc',
    border: '1px solid #0077b6',
    borderRadius: '12px',
    padding: '15px',
    marginBottom: '20px',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  chatTitle: {
    marginBottom: '10px',
    color: '#0077b6',
  },
  chatMessages: {
    fontSize: '18px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  label: {
    fontWeight: 'bold',
    color: '#003f5c',
  },
  input: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #ffb703',
    outline: 'none',
    fontSize: '14px',
  },
  button: {
    backgroundColor: '#0077b6',
    color: 'white',
    padding: '10px 15px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.3s',
  },
  feedback: {
    marginTop: '15px',
    backgroundColor: '#fff3cd',
    padding: '10px',
    borderRadius: '8px',
    color: '#856404',
    border: '1px solid #ffeeba',
  },
};

export default StudentsDashboard;