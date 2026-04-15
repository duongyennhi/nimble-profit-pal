const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const getUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        u.id,
        u.username,
        u.full_name,
        u.email,
        u.phone,
        u.status,
        u.role_id,
        r.code AS role_code,
        r.name AS role_name,
        u.created_at,
        u.updated_at
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.id ASC
    `);

    return res.json({ users: rows });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ message: 'Lỗi lấy danh sách người dùng' });
  }
};

const getRoles = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, code, name
      FROM roles
      ORDER BY id ASC
    `);

    return res.json({ roles: rows });
  } catch (error) {
    console.error('Get roles error:', error);
    return res.status(500).json({ message: 'Lỗi lấy danh sách vai trò' });
  }
};

const createUser = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const {
      username,
      password,
      full_name,
      email,
      phone,
      role_id,
    } = req.body;

    if (!username || !password || !full_name || !role_id) {
      await connection.rollback();
      return res.status(400).json({
        message: 'Vui lòng nhập đầy đủ tên đăng nhập, mật khẩu, họ tên và vai trò',
      });
    }

    const [[existingUser]] = await connection.query(
      `SELECT id FROM users WHERE username = ? LIMIT 1`,
      [username.trim()]
    );

    if (existingUser) {
      await connection.rollback();
      return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
    }

    if (email) {
      const [[existingEmail]] = await connection.query(
        `SELECT id FROM users WHERE email = ? LIMIT 1`,
        [email.trim()]
      );

      if (existingEmail) {
        await connection.rollback();
        return res.status(400).json({ message: 'Email đã tồn tại' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await connection.query(
      `
      INSERT INTO users (
        username,
        password_hash,
        full_name,
        email,
        phone,
        role_id,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, 'active')
      `,
      [
        username.trim(),
        hashedPassword,
        full_name.trim(),
        email?.trim() || null,
        phone?.trim() || null,
        Number(role_id),
      ]
    );

    await connection.commit();

    return res.status(201).json({
      message: 'Tạo người dùng thành công',
      user_id: result.insertId,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create user error:', error);
    return res.status(500).json({
      message: 'Lỗi tạo người dùng',
      error: error.message,
      sqlMessage: error.sqlMessage || null,
      code: error.code || null,
    });
  } finally {
    connection.release();
  }
};

const updateUser = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const {
      username,
      full_name,
      email,
      phone,
      role_id,
    } = req.body;

    if (!username || !full_name || !role_id) {
      await connection.rollback();
      return res.status(400).json({
        message: 'Vui lòng nhập đầy đủ tên đăng nhập, họ tên và vai trò',
      });
    }

    const [[user]] = await connection.query(
      `SELECT id FROM users WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!user) {
      await connection.rollback();
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const [[existingUsername]] = await connection.query(
      `SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1`,
      [username.trim(), id]
    );

    if (existingUsername) {
      await connection.rollback();
      return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
    }

    if (email) {
      const [[existingEmail]] = await connection.query(
        `SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1`,
        [email.trim(), id]
      );

      if (existingEmail) {
        await connection.rollback();
        return res.status(400).json({ message: 'Email đã tồn tại' });
      }
    }

    await connection.query(
      `
      UPDATE users
      SET
        username = ?,
        full_name = ?,
        email = ?,
        phone = ?,
        role_id = ?
      WHERE id = ?
      `,
      [
        username.trim(),
        full_name.trim(),
        email?.trim() || null,
        phone?.trim() || null,
        Number(role_id),
        id,
      ]
    );

    await connection.commit();

    return res.json({ message: 'Cập nhật người dùng thành công' });
  } catch (error) {
    await connection.rollback();
    console.error('Update user error:', error);
    return res.status(500).json({
      message: 'Lỗi cập nhật người dùng',
      error: error.message,
      sqlMessage: error.sqlMessage || null,
      code: error.code || null,
    });
  } finally {
    connection.release();
  }
};

const resetUserPassword = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || String(new_password).length < 6) {
      await connection.rollback();
      return res.status(400).json({
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự',
      });
    }

    const [[user]] = await connection.query(
      `SELECT id FROM users WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!user) {
      await connection.rollback();
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const hashedPassword = await bcrypt.hash(String(new_password), 10);

    await connection.query(
      `
      UPDATE users
      SET password_hash = ?
      WHERE id = ?
      `,
      [hashedPassword, id]
    );

    await connection.commit();

    return res.json({ message: 'Đặt lại mật khẩu thành công' });
  } catch (error) {
    await connection.rollback();
    console.error('Reset user password error:', error);
    return res.status(500).json({
      message: 'Lỗi đặt lại mật khẩu',
      error: error.message,
      sqlMessage: error.sqlMessage || null,
      code: error.code || null,
    });
  } finally {
    connection.release();
  }
};

const toggleUserStatus = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;

    const [[user]] = await connection.query(
      `
      SELECT id, status, username
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!user) {
      await connection.rollback();
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    if (user.username === 'admin') {
      await connection.rollback();
      return res.status(400).json({ message: 'Không thể khóa tài khoản admin mặc định' });
    }

    const nextStatus = user.status === 'active' ? 'inactive' : 'active';

    await connection.query(
      `
      UPDATE users
      SET status = ?
      WHERE id = ?
      `,
      [nextStatus, id]
    );

    await connection.commit();

    return res.json({
      message: nextStatus === 'active' ? 'Mở khóa người dùng thành công' : 'Khóa người dùng thành công',
      status: nextStatus,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Toggle user status error:', error);
    return res.status(500).json({
      message: 'Lỗi cập nhật trạng thái người dùng',
      error: error.message,
      sqlMessage: error.sqlMessage || null,
      code: error.code || null,
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  getUsers,
  getRoles,
  createUser,
  updateUser,
  resetUserPassword,
  toggleUserStatus,
};