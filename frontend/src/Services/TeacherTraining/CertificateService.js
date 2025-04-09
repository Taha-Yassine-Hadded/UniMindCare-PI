import apiClient from './apiClient';

const CertificateService = {
  // Get user's certificates
  getMyCertificates: async () => {
    try {
      const response = await apiClient.get('/certificates/my-certificates');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Add a new certificate for a completed program
  addCertificate: async (programId) => {
    try {
      const response = await apiClient.post(`/certificates/${programId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default CertificateService;