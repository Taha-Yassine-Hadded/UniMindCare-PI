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
    // Check if updates is FormData (for image upload)
    if (updates instanceof FormData) {
      // Need to use custom axios config for multipart/form-data
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      };
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/programs/${programId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: updates
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      return await response.json();
    } else {
      // Regular JSON update
      const response = await apiClient.put(`/programs/${programId}`, updates);
      return response.data;
    }
  } catch (error) {
    console.error('Error in updateProgram:', error);
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

  // Recommend a program
  recommendProgram: async (programId) => {
    try {
      const response = await apiClient.post(`/programs/${programId}/recommend`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Unrecommend a program
  unrecommendProgram: async (programId) => {
    try {
      const response = await apiClient.post(`/programs/${programId}/unrecommend`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

};

export default ProgramService;