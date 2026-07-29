import axios from 'axios';
axios.post('https://college-erp-fic1.onrender.com/api/timetable', {
  department: 'CSE', semester: '1', schedule: []
}).catch(err => console.log(err.response?.data || err.message));
