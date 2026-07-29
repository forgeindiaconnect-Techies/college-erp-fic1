import http from 'http';

const data = JSON.stringify({
  id: 'STF002',
  name: 'Test Staff',
  email: 'teststaff@gmail.com',
  phone: '1234567890',
  dept: 'Information Technology',
  designation: 'Assistant Prof.',
  workload: 16,
  attendance: 100,
  subjects: []
});

const options = {
  hostname: 'localhost',
  port: 5173,
  path: '/api/staff',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Authorization': 'Bearer mock-hod-token'
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${body}`);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
