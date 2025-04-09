import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
});

// Helper function to get token from either storage
const getAuthToken = () => {
  // Try localStorage first
  const localStorageToken = localStorage.getItem('token');
  if (localStorageToken) return localStorageToken;
  
  // If not in localStorage, try sessionStorage
  const sessionStorageToken = sessionStorage.getItem('token');
  if (sessionStorageToken) return sessionStorageToken;
  
  // No token found
  return null;
};




// Add request interceptor to inject token
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle token expiration - clear from both storages
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;