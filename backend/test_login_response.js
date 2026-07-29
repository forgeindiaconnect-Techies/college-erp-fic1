import http from 'http';

const data = JSON.stringify({
  email: 'admin@college.edu',
  password: 'admin123'
});

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('HTTP Status Code:', res.statusCode);
    console.log('Response Body:', body);
  });
});

req.on('error', (err) => console.error(err));
req.write(data);
req.end();
