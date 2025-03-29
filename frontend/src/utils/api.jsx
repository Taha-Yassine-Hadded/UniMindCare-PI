import axios from 'axios';

export const fetchUsers = async () => {
  try {
    const response = await axios.get('http://localhost:5000/api/users'); // Replace with your backend API endpoint
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};