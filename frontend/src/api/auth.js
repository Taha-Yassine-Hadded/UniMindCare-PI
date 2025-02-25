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

export const verifyTwoFactor = async (identifier, otp) => {
  try {
    // Vous pouvez choisir d'utiliser soit `userId` soit `email` comme identifiant
    const payload = identifier.includes('@') 
      ? { email: identifier, token: otp } 
      : { _id: identifier, token: otp };

    const response = await axios.post(`${API_URL}/verify-2fa`, payload);
    return response.data; // Retourne la réponse du backend
  } catch (error) {
    console.error('Erreur lors de la vérification du 2FA :', error);
    throw error.response?.data || { message: 'Erreur lors de la vérification du 2FA' };
  }
};
