import http from 'http';

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body || '{}') }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function testReactivation() {
  const loginData = JSON.stringify({ email: 'admin@college.edu', password: 'admin123' });
  const loginOpts = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
  };

  // 1. Try login while deactivated -> expect 403
  const res1 = await makeRequest(loginOpts, loginData);
  console.log('1. Login while Deactivated:', res1.status, res1.body);

  // 2. Reactivate via status route
  const activateData = JSON.stringify({ status: 'Active' });
  const activateOpts = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/colleges/COL001/status',
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Content-Length': activateData.length }
  };
  // Mock auth token for Super Admin
  const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhNjA4YjNlN2EzZmI0YjI5ZmY0ZmI3YiIsImlhdCI6MTc4NDcxNzcwNSwiZXhwIjoxNzg3MzA5NzA1fQ.MJhuMYzwqAjBtxNzpBjm5IlwkVKuIzMTkxBvEb0Bujc';
  activateOpts.headers['Authorization'] = `Bearer mock-superadmin`;
  const res2 = await makeRequest(activateOpts, activateData);
  console.log('2. Reactivate College Status:', res2.status, res2.body.message);

  // 3. Try login while active -> expect 200
  const res3 = await makeRequest(loginOpts, loginData);
  console.log('3. Login after Reactivation:', res3.status, res3.body.name ? 'SUCCESS (' + res3.body.name + ' logged in)' : res3.body);
}

testReactivation();
