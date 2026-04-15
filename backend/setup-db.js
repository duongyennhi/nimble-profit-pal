require('dotenv').config();
const mysql = require('mysql2/promise');

async function runSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const statements = [
    `CREATE TABLE IF NOT EXISTS roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      status VARCHAR(20) DEFAULT 'active',
      role_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `INSERT INTO roles (code, name) VALUES
    ('admin', 'Administrator'),
    ('manager', 'Manager'),
    ('user', 'User')
    ON DUPLICATE KEY UPDATE name = VALUES(name)`,
    `INSERT INTO users (full_name, username, password_hash, email, role_id) VALUES
    ('Admin User', 'admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@example.com', 1)
    ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)`
  ];

  for (const sql of statements) {
    await connection.execute(sql);
  }

  console.log('Schema executed successfully');
  await connection.end();
}

runSchema().catch(console.error);