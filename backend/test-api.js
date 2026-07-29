const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/register-college', {
      collegeName: 'GLOBAL TECH INSTITUTE',
      adminName: 'SABARI',
      email: 'sabari@gmail.com',
      phone: '9876543210',
      password: 'password123'
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.log('Error data:', err.response?.data);
    console.log('Error status:', err.response?.status);
    console.log('Error message:', err.message);
  }
}
test();
