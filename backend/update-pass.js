require('dotenv').config();
const mysql = require('mysql2/promise');

async function updatePassword() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  await connection.execute('UPDATE users SET password_hash = ? WHERE username = ?', ['$2b$10$LHFiU2gHNqtBgkQWZz8vXemEsLUGKsNi5ovtVosSFe.4lVSb2ZCge', 'admin']);
  console.log('Password updated');

  await connection.end();
}

updatePassword().catch(console.error);