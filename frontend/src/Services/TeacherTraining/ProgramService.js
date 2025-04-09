import apiClient from './apiClient';

const ProgramService = {
  // Get all programs for the authenticated psychologist
  getMyPrograms: async () => {
    try {
      const response = await apiClient.get('/programs/my-programs');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get all programs
  getAllPrograms: async () => {
    try {
      const response = await apiClient.get('/programs/all-programs');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Create a new program
  createProgram: async (programData) => {
    try {
      const response = await apiClient.post('/programs', programData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get details of a specific program
  getProgramDetails: async (programId) => {
    try {
      const response = await apiClient.get(`/programs/${programId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update an existing program
  updateProgram: async (programId, updates) => {
    try {
      const response = await apiClient.patch(`/programs/${programId}`, updates);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete a program
  deleteProgram: async (programId) => {
    try {
      const response = await apiClient.delete(`/programs/${programId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

};

export default ProgramService;