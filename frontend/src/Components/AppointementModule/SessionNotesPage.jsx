import React, { useEffect, useState } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import SessionNoteManagement from './SessionNoteManagement';
import axios from 'axios';

const SessionNotesPage = () => {
  const navigate = useNavigate();
  const { userData, token } = useOutletContext() || {};
  const { caseId } = useParams();
  const [authToken, setAuthToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      // Essayer d'obtenir le token de plusieurs sources
      let finalToken = token;
      
      // Si pas de token du contexte, essayer localStorage et sessionStorage
      if (!finalToken) {
        finalToken = localStorage.getItem('token') || 
                    sessionStorage.getItem('token') || 
                    localStorage.getItem('authToken');
      }
      
      // Si toujours pas de token, essayer de se connecter à nouveau en arrière-plan
      if (!finalToken && localStorage.getItem('refreshToken')) {
        try {
          // Essayer de rafraîchir le token si un refreshToken existe
          const refreshResponse = await axios.post('http://localhost:5000/api/auth/refresh-token', {
            refreshToken: localStorage.getItem('refreshToken')
          });
          
          if (refreshResponse.data.token) {
            finalToken = refreshResponse.data.token;
            localStorage.setItem('token', finalToken);
            console.log('Token refreshed successfully');
          }
        } catch (err) {
          console.error('Failed to refresh token:', err);
        }
      }
      
      // En dernier recours, essayer de récupérer un token à partir d'un autre endroit
      // par exemple en appelant un endpoint dédié
      if (!finalToken) {
        try {
          const response = await axios.get('http://localhost:5000/api/auth/token', {
            withCredentials: true  // Nécessaire si vous utilisez des cookies
          });
          
          if (response.data.token) {
            finalToken = response.data.token;
            localStorage.setItem('token', finalToken);
          }
        } catch (err) {
          console.error('Failed to retrieve token from API:', err);
        }
      }
      
      // Déterminer l'utilisateur final
      let finalUser = userData;
      if (!finalUser) {
        try {
          finalUser = JSON.parse(localStorage.getItem('user') || '{}');
        } catch (error) {
          console.error('Error parsing user from localStorage:', error);
          finalUser = {};
        }
      }
      
      // Si nous avons un token mais pas d'utilisateur, essayer de récupérer les infos utilisateur
      if (finalToken && (!finalUser || !finalUser.userId)) {
        try {
          const userResponse = await axios.get('http://localhost:5000/api/users/current', {
            headers: {
              Authorization: `Bearer ${finalToken}`
            }
          });
          
          if (userResponse.data) {
            finalUser = userResponse.data;
            localStorage.setItem('user', JSON.stringify(finalUser));
          }
        } catch (err) {
          console.error('Failed to fetch user data:', err);
        }
      }
      
      // Mettre à jour l'état avec les valeurs finales
      setAuthToken(finalToken);
      setUser(finalUser);
      setLoading(false);
      
      // Logs de débogage
      console.log('Final authentication state:', { 
        token: finalToken ? 'Present' : 'Missing', 
        user: finalUser
      });
    };
    
    init();
  }, [token, userData]);

  // Afficher un loader pendant le chargement
  if (loading) {
    return <div className="text-center p-5"><span className="spinner-border"></span> Loading...</div>;
  }

  // Rediriger vers la connexion si pas de token
  if (!authToken) {
    console.warn('SessionNotesPage - No authentication token found. Redirecting to login.');
    navigate('/login', { state: { from: `/session-notes/${caseId}` } });
    return null;
  }

  // Valider les données utilisateur
  if (!user || !user.userId) {
    console.warn('SessionNotesPage - Invalid user data. Redirecting to login.');
    navigate('/login', { state: { from: `/session-notes/${caseId}` } });
    return null;
  }

  // Si tout est bon, afficher le composant
  return (
    <div className="session-notes-page">
      <SessionNoteManagement caseId={caseId} token={authToken} userData={user} />
    </div>
  );
};

export default SessionNotesPage;