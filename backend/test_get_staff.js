const axios = require('axios');
(async () => {
  try {
    const adminLogin = await axios.post('http://localhost:5000/api/auth/login', { email: 'admin@college.edu', password: 'password123' });
    const res = await axios.get('http://localhost:5000/api/staff', { headers: { Authorization: `Bearer ${adminLogin.data.token}` } });
    console.log(res.data.map(s => `${s.name} - ${s.dept}`));
  } catch(err) {
    console.error(err.message);
  }
})();
