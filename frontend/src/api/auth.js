import axios from 'axios';

const API_URL = 'http://localhost:5000/api/auth';
// Fonction pour connecter un utilisateur
export const loginUser = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/login`, { email, password });
    return response.data; // Retourne la réponse du backend
  } catch (error) {
    console.error('Erreur lors de la connexion :', error);
    throw error.response?.data || { message: 'Erreur lors de la connexion' };
  }
};

// Fonction pour vérifier l'OTP pour le 2FA
export const verifyTwoFactor = async (email, otp) => {
  try {
    const response = await axios.post(`${API_URL}/verify-2fa`, { email, token: otp });
    return response.data; // Retourne la réponse du backend
  } catch (error) {
    console.error('Erreur lors de la vérification du 2FA :', error);
    throw error.response?.data || { message: 'Erreur lors de la vérification du 2FA' };
  }
};
