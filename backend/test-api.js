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

async function testAPI() {
  try {
    // Login first
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

    // Test users API
    const usersResponse = await makeRequest({
      hostname: 'localhost',
      port: 5010,
      path: '/api/auth/me',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${loginResponse.data.token}`
      }
    });

    console.log('Auth me response:', usersResponse);

  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();