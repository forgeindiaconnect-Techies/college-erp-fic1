const axios = require('axios');

async function test() {
  try {
    const res1 = await axios.get('http://localhost:5000/');
    console.log('localhost:', res1.data);
  } catch (err) {
    console.error('localhost Error:', err.message);
  }
  
  try {
    const res2 = await axios.get('http://127.0.0.1:5000/');
    console.log('127.0.0.1:', res2.data);
  } catch (err) {
    console.error('127.0.0.1 Error:', err.message);
  }
}
test();
