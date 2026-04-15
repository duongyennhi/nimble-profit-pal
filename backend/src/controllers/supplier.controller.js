const { pool } = require('../config/db');

const getSuppliers = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, name, phone, email, address, note
      FROM suppliers
      ORDER BY id DESC
    `);

    return res.json({ suppliers: rows });
  } catch (error) {
    console.error('Get suppliers error:', error);
    return res.status(500).json({ message: 'Lỗi lấy danh sách nhà cung cấp' });
  }
};

const createSupplier = async (req, res) => {
  try {
    const { name, phone, email, address, note } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập tên nhà cung cấp' });
    }

    const [result] = await pool.query(
      `
      INSERT INTO suppliers (name, phone, email, address, note)
      VALUES (?, ?, ?, ?, ?)
      `,
      [name.trim(), phone || null, email || null, address || null, note || null]
    );

    return res.status(201).json({
      message: 'Thêm nhà cung cấp thành công',
      id: result.insertId,
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    return res.status(500).json({ message: 'Lỗi thêm nhà cung cấp' });
  }
};

const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address, note } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập tên nhà cung cấp' });
    }

    await pool.query(
      `
      UPDATE suppliers
      SET name = ?, phone = ?, email = ?, address = ?, note = ?
      WHERE id = ?
      `,
      [name.trim(), phone || null, email || null, address || null, note || null, id]
    );

    return res.json({ message: 'Cập nhật nhà cung cấp thành công' });
  } catch (error) {
    console.error('Update supplier error:', error);
    return res.status(500).json({ message: 'Lỗi cập nhật nhà cung cấp' });
  }
};

const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const [usedRows] = await pool.query(
      `SELECT id FROM purchase_receipts WHERE supplier_id = ? LIMIT 1`,
      [id]
    );

    if (usedRows.length > 0) {
      return res.status(400).json({
        message: 'Nhà cung cấp đã phát sinh phiếu nhập, không thể xóa',
      });
    }

    await pool.query(`DELETE FROM suppliers WHERE id = ?`, [id]);

    return res.json({ message: 'Xóa nhà cung cấp thành công' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    return res.status(500).json({ message: 'Lỗi xóa nhà cung cấp' });
  }
};

module.exports = {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};