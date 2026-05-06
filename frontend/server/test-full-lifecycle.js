const http = require('http');

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;

    const options = {
      hostname: 'localhost',
      port: 4000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testAccountLifecycle() {
  try {
    console.log('=== Testing Account Lifecycle ===\n');

    // Step 1: Register a new account
    console.log('Step 1: Registering new account...');
    const registerRes = await makeRequest('POST', '/api/auth/register', {
      name: 'Delete Test User',
      email: `deletetest${Date.now()}@example.com`,
      password: 'password123',
      securityQuestion: "What is your pet's name?",
      securityAnswer: 'Fluffy',
    });

    if (registerRes.status !== 200) {
      console.error('✗ Registration failed:', registerRes.body);
      return;
    }

    const token = registerRes.body.token;
    const userId = registerRes.body.user.id;
    console.log(`✓ Account created! User ID: ${userId}`);
    console.log(`✓ Token: ${token.substring(0, 50)}...\n`);

    // Step 2: Delete the account
    console.log('Step 2: Deleting account...');
    const deleteRes = await makeRequest('DELETE', '/api/auth/delete-account', null, token);

    if (deleteRes.status !== 200) {
      console.error('✗ Deletion failed (status ' + deleteRes.status + '):', deleteRes.body);
      return;
    }

    console.log('✓ Account deleted successfully!');
    console.log('✓ Response:', deleteRes.body);

    // Step 3: Try to login with deleted account (should fail)
    console.log('\nStep 3: Verifying account is deleted (attempting login)...');
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: registerRes.body.user.email,
      password: 'password123',
    });

    if (loginRes.status === 401) {
      console.log('✓ Confirmed: Deleted account cannot login\n');
      console.log('=== All tests passed! ===');
    } else {
      console.warn('⚠ Unexpected: Account still exists after deletion');
    }
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

testAccountLifecycle();
