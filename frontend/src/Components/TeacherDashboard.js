import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  toggleExitSorting,
  organizeExit,
  approveNext,
  getExitRequests
} from '../Services/api';

function TeacherDashboard({ token: propToken }) {
  const navigate = useNavigate();
  const token = propToken || localStorage.getItem('token') || sessionStorage.getItem('token');

  const [sortingEnabled, setSortingEnabled] = useState(false);
  const [requests, setRequests] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Appliquer un fond global à la page
    document.body.style.background = 'linear-gradient(to right, #e3eaf3, #f6f8fb)';
    document.body.style.margin = 0;
    document.body.style.fontFamily = 'Helvetica Neue, sans-serif';

    if (!token) {
      navigate('/login');
      return;
    }

    fetchRequests();
  }, [token, navigate]);

  const fetchRequests = async () => {
    try {
      const response = await getExitRequests(token);
      setRequests(response.sortedRequests);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Erreur lors de la récupération des demandes');
    }
  };

  const handleToggleSorting = async () => {
    try {
      const response = await toggleExitSorting(!sortingEnabled, token);
      setSortingEnabled(!sortingEnabled);
      setMessage(response.message);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Erreur lors du basculement');
    }
  };

  const handleOrganize = async () => {
    try {
      const response = await organizeExit(token);
      setRequests(response.sortedRequests);
      setMessage(response.message);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Erreur lors de l’organisation');
    }
  };

  const handleApproveNext = async () => {
    try {
      const response = await approveNext(token);
      setMessage(response.message);
      fetchRequests();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Erreur lors de l’approbation');
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Tableau de bord Enseignant</h2>

      <div style={styles.actions}>
        <button onClick={handleToggleSorting} style={styles.button}>
          {sortingEnabled ? 'Désactiver' : 'Activer'} le tri
        </button>
        <button
          onClick={handleOrganize}
          disabled={!sortingEnabled}
          style={{ ...styles.button, opacity: sortingEnabled ? 1 : 0.6 }}
        >
          Organiser les sorties
        </button>
        <button
          onClick={handleApproveNext}
          disabled={!sortingEnabled}
          style={{ ...styles.button, opacity: sortingEnabled ? 1 : 0.6 }}
        >
          Autoriser le prochain
        </button>
      </div>

      <div style={styles.section}>
        <h3 style={styles.subTitle}>Demandes en attente</h3>
        <ul style={styles.list}>
          {requests.map((req) => (
            <li key={req._id} style={styles.listItem}>
              <div>
                <strong>{req.studentId?.Name}</strong> — {req.reason}
              </div>
              <div style={styles.meta}>
                <span style={styles.metaItem}>Priorité : {req.priority}</span>
                <span style={styles.metaItem}>Ordre : {req.exitOrder || 'Non défini'}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {message && <div style={styles.message}>{message}</div>}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1100px',
    margin: '60px auto',
    padding: '50px 60px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08)',
    color: '#1a1a1a',
  },
  title: {
    fontSize: '26px',
    color: '#003566',
    textAlign: 'center',
    marginBottom: '30px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
    marginBottom: '30px',
    flexWrap: 'wrap'
  },
  button: {
    backgroundColor: '#003566',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '15px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background 0.3s ease',
  },
  section: {
    marginTop: '20px'
  },
  subTitle: {
    fontSize: '20px',
    borderBottom: '1px solid #ccc',
    paddingBottom: '8px',
    marginBottom: '20px',
    color: '#1a1a1a'
  },
  list: {
    listStyle: 'none',
    padding: 0
  },
  listItem: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '12px',
    borderLeft: '4px solid #0077b6',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  meta: {
    display: 'flex',
    gap: '20px',
    fontSize: '13px',
    color: '#555',
  },
  metaItem: {
    backgroundColor: '#e9ecef',
    padding: '4px 8px',
    borderRadius: '6px'
  },
  message: {
    marginTop: '25px',
    backgroundColor: '#e8f0fe',
    color: '#003566',
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center',
    border: '1px solid #bcd0ee'
  }
};

export default TeacherDashboard;
