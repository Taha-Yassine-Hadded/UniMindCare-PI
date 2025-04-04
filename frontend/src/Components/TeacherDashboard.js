import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Ajoutez ceci pour la navigation
import { toggleExitSorting, organizeExit, approveNext, getExitRequests } from '../Services/api';

function TeacherDashboard({ token: propToken }) {
  const navigate = useNavigate(); // Pour rediriger vers /login

  // Récupération du token depuis prop, localStorage ou sessionStorage
  const token = propToken || localStorage.getItem('token') || sessionStorage.getItem('token');
  console.log("Token dans TeacherDashboard:", token);

  // Déclaration des hooks
  const [sortingEnabled, setSortingEnabled] = useState(false);
  const [requests, setRequests] = useState([]);
  const [message, setMessage] = useState('');

  // Fonction de récupération des demandes
  const fetchRequests = async () => {
    try {
      const response = await getExitRequests(token);
      setRequests(response.sortedRequests);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Erreur lors de la récupération des demandes');
    }
  };

  // Vérification du token et récupération des données
  useEffect(() => {
    if (!token) {
      navigate('/login'); // Redirige vers la page de connexion si pas de token
      return;
    }
    fetchRequests();
  }, [token, navigate]);

  // Fonctions pour gérer les actions
  const handleToggleSorting = async () => {
    console.log('Token envoyé:', token);
    try {
      const response = await toggleExitSorting(!sortingEnabled, token);
      setSortingEnabled(!sortingEnabled);
      setMessage(response.message);
    } catch (error) {
      console.error('Erreur:', error.response?.data);
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

  // Si le token est absent, useEffect gère la redirection, donc pas besoin de ce return
  // Mais on peut laisser un rendu conditionnel pendant le chargement si nécessaire
  return (
    <div>
      <h2>Tableau de bord enseignant</h2>
      <div>
        <button onClick={handleToggleSorting}>
          {sortingEnabled ? 'Désactiver' : 'Activer'} le tri des sorties
        </button>
        <button onClick={handleOrganize} disabled={!sortingEnabled}>
          Organiser les sorties
        </button>
        <button onClick={handleApproveNext} disabled={!sortingEnabled}>
          Autoriser le prochain
        </button>
      </div>
      <h3>Demandes en attente</h3>
      <ul>
        {requests.map((req) => (
          <li key={req._id}>
            {req.studentId.Name} - {req.reason} (Priorité: {req.priority}, Ordre: {req.exitOrder || 'Non défini'})
          </li>
        ))}
      </ul>
      {message && <p>{message}</p>}
    </div>
  );
}

export default TeacherDashboard;