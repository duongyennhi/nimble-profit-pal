require('dotenv').config();
const app = require('./app');
const { pool } = require('./config/db');

const PORT = process.env.PORT || 5010;

async function startServer() {
  try {
    const connection = await pool.getConnection();
    console.log('MySQL connected successfully');
    connection.release();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server error:', error);
  }
}

startServer();