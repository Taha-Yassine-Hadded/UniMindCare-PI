import axios from 'axios';

const API_URL = 'http://localhost:5000/api'; // Remplacez par l'URL réelle de votre API

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const submitExitRequest = (data, token) => {
  return api
    .post('/exit-request', data, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((res) => res.data);
};

export const toggleExitSorting = (enable, token) => {
  return api
    .put('/toggle-exit-sorting', { enable }, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((res) => res.data);
};

export const organizeExit = (token) => {
  return api
    .post('/organize-exit', {}, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((res) => res.data);
};

export const approveNext = (token) => {
  return api
    .post('/approve-next', {}, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((res) => res.data);
};

export const getExitRequests = (token) => {
  return api
    .get('/exit-requests', {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((res) => res.data);
};