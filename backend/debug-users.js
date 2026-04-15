require('dotenv').config();
const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function test() {
  try {
    console.log('Step 1: Login...');
    const loginResponse = await makeRequest({
      hostname: 'localhost',
      port: 5010,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    }, JSON.stringify({
      username: 'admin',
      password: 'password'
    }));

    console.log('Login response:', loginResponse);

    if (!loginResponse.data.token) {
      console.error('No token received');
      return;
    }

    const token = loginResponse.data.token;
    console.log('\nStep 2: Test users API...');

    const usersResponse = await makeRequest({
      hostname: 'localhost',
      port: 5010,
      path: '/api/users',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    console.log('Users response:', usersResponse);
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit();
}

test();
