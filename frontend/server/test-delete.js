const http = require('http');

const token = process.env.TEST_ACCESS_TOKEN;

if (!token) {
  console.error('Set TEST_ACCESS_TOKEN to run this local endpoint test.');
  process.exitCode = 1;
} else {
  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/auth/delete-account',
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
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
      } catch {
        console.log(data);
      }
    });
  });

  req.on('error', (error) => {
    console.error(`Problem with request: ${error.message}`);
  });

  console.log('Testing delete-account endpoint with a supplied access token.');
  req.end();
}
