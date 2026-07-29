import axios from 'axios';
const API_URL = 'http://localhost:5000/api';

const createPoojasree = async () => {
  try {
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'vaideeswari@gmail.com',
      password: 'password123'
    });
    const token = loginRes.data.token;
    console.log('Logged in as Vaideeswari, token:', token.substring(0, 20) + '...');

    const staffData = {
      id: 'STF005',
      name: 'Poojasree',
      email: 'poojasree@gmail.com',
      phone: '9876543210',
      designation: 'Professor',
      workload: 16,
      subjects: ['Electronics', 'OS'],
      attendance: 100,
      dept: 'Biotechnology Engineering',
      status: 'Pending Approval'
    };

    const res = await axios.post(`${API_URL}/staff`, staffData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Created successfully:', res.status);
  } catch (error) {
    console.error('Error:', error.response?.status, error.response?.data || error.message);
  }
};
createPoojasree();
