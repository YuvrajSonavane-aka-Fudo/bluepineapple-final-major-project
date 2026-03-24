import axios from 'axios';

const BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('session_id');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['Content-Type'] = 'application/json';
  return config;
});

export const loginWithEmail = (email) =>
  api.post('/connect/', { login_type: 'PASSWORD', email }).then(r => r.data);

export const fetchProjects = () =>
  api.get('/projects/').then(r => r.data);

export const fetchEmployeeDashboard = (body, signal) =>
  api.post('/dashboard/employees/', body, { signal }).then(r => r.data);

export const fetchProjectDashboard = (body, signal) =>
  api.post('/dashboard/projects/', body, { signal }).then(r => r.data);

export const fetchEmployeeCellDetails = (body) =>
  api.post('/dashboard/employee-cell-details/', body).then(r => r.data);

export const fetchProjectCellDetails = (body) =>
  api.post('/dashboard/project-cell-details/', body).then(r => r.data);

export const fetchDayDetails = (body) =>
  api.post('/dashboard/day-details/', body).then(r => r.data);

export default api;