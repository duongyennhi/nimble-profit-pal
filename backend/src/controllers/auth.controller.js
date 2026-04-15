const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

exports.login = async (req, res) => {
  try {
    console.log('BODY =', req.body);

    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        message: 'Vui lòng nhập username và password'
      });
    }

    const [rows] = await pool.query(
      `SELECT 
          u.id,
          u.full_name,
          u.username,
          u.password_hash,
          u.status,
          r.code AS roleCode,
          r.name AS roleName
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.username = ?
       LIMIT 1`,
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        message: 'Sai tài khoản hoặc mật khẩu'
      });
    }

    const user = rows[0];

    if (user.status !== 'active') {
      return res.status(403).json({
        message: 'Tài khoản đã bị khóa'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Sai tài khoản hoặc mật khẩu'
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        roleCode: user.roleCode,
        roleName: user.roleName
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    );

    await pool.query(
      `UPDATE users SET last_login_at = NOW() WHERE id = ?`,
      [user.id]
    );

    return res.json({
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        username: user.username,
        roleCode: user.roleCode,
        roleName: user.roleName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      message: 'Lỗi server',
      error: error.message
    });
  }
};

exports.me = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
          u.id,
          u.full_name,
          u.username,
          u.phone,
          u.email,
          u.status,
          r.code AS roleCode,
          r.name AS roleName
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?
       LIMIT 1`,
      [req.user.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: 'Không tìm thấy người dùng'
      });
    }

    return res.json({
      user: rows[0]
    });
  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({
      message: 'Lỗi server',
      error: error.message
    });
  }
};