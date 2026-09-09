const http = require('http');

const testData = {
  name: 'Test User',
  email: `testuser${Date.now()}@example.com`,
  password: 'password123',
  securityQuestion: "What is your pet's name?",
  securityAnswer: 'Fluffy',
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  },
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);

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

console.log('Testing registration with:', testData);
console.log('');

req.write(postData);
req.end();
