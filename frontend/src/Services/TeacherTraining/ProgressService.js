import apiClient from './apiClient';

const ProgressService = {
  markContentComplete: async (contentId) => {
    try {
      const response = await apiClient.post(`/progress/content/${contentId}/complete`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  submitQuiz: async (contentId, responses) => {
    try {
      const response = await apiClient.post(`/progress/content/${contentId}/submit-quiz`, { responses });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getProgramProgress: async (programId) => {
    try {
      const response = await apiClient.get(`/progress/${programId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default ProgressService;