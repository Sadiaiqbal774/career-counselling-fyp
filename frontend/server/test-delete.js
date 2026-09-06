const http = require('http');

// Use the token from the previous registration
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoidGVzdHVzZXIxNzc4MDkyNDE4NTk0QGV4YW1wbGUuY29tIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTc3ODA5MjQxOCwiZXhwIjoxNzc4Njk3MjE4fQ.zs-X9dEUJCooWbmEA3lqYrfRUJItnFr8N3FDNAAoGOA';

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/auth/delete-account',
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response body:');
    try {
      console.log(JSON.stringify(JSON.parse(data), null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error(`Problem with request: ${error.message}`);
});

console.log('Testing delete-account endpoint with token:', token.substring(0, 30) + '...');
console.log('');

req.end();
