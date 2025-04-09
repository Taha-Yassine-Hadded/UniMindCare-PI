import apiClient from './apiClient';

const ContentService = {
  // Create new content for a program
  createContent: async (trainingProgramId, contentData) => {
    try {
      const response = await apiClient.post(`/training-content/${trainingProgramId}`, contentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get all contents for a specific program
  getProgramContents: async (programId) => {
    try {
      const response = await apiClient.get(`/training-content/program/${programId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Updated method to submit quiz results
  submitQuizResult: async (contentId, result) => {
    const response = await apiClient.post(`/training-content/${contentId}/submit-quiz-result`, {
      result
    });
    return response.data;
  },


  // Delete content
  deleteContent: async (contentId) => {
    try {
      const response = await apiClient.delete(`/training-content/${contentId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default ContentService;