const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: '123456',
  database: 'revenue_management'
});

connection.connect(err => {
  if (err) throw err;
  console.log('MySQL Connected!');
});