import axios from 'axios';

const API_BASE_URL = '/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const releaseService = {
  // Get recent releases with optional filtering
  async getReleases(params = {}) {
    const response = await api.get('/releases', { params });
    return response.data;
  },

  // Get release statistics
  async getReleaseStats() {
    const response = await api.get('/releases/stats');
    return response.data;
  },

  // Get release definitions
  async getReleaseDefinitions() {
    const response = await api.get('/releases/definitions');
    return response.data;
  },

  // Get pending approvals
  async getPendingApprovals() {
    const response = await api.get('/releases/approvals');
    return response.data;
  },
};
