import apiClient from './apiClient';

const AuthService = {
  getCurrentUser: async () => {
    try {
      const response = await apiClient.get('/users/auth/me');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default AuthService;