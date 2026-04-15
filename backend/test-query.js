require('dotenv').config();
const { pool, testConnection } = require('./src/config/db');

async function testQuery() {
  try {
    await testConnection();
    console.log('Connection test passed');

    const [rows] = await pool.query(`
      SELECT
        u.id,
        u.username,
        u.full_name,
        u.email,
        u.phone,
        u.status,
        r.code AS role_code,
        r.name AS role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.id ASC
    `);

    console.log('Query successful:', rows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

testQuery();