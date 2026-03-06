import api from '../axios';
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

export const registerUser = async (formData) => {
  const response = await api.post('/auth/register', formData);
  return response.data;
};

export const registerWithGoogle = async () => {
  const authData = await pb.collection('users').authWithOAuth2({ 
    provider: 'google',
    createData: { role: 'user' }
  });
  
  const response = await api.post('/auth/google/pocketbase', { record: authData.record });
  return response.data;
};

export const getDashboardData = async () => {
  const response = await api.get('/auth/me');
  return response.data.user;
};

export const logoutUser = async () => {
  const response = await api.get('/auth/logout');
  return response.data;
};
