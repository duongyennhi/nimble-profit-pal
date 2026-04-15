const { pool } = require('../config/db');

const getProducts = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        p.id,
        p.code,
        p.name,
        p.unit,
        p.cost_price,
        p.sale_price,
        p.stock_quantity,
        p.min_stock,
        p.status,
        p.category_id,
        p.image_url,
        p.product_type,
        p.can_purchase,
        p.can_sell,
        c.name AS category_name
      FROM products p
      LEFT JOIN product_categories c ON p.category_id = c.id
      ORDER BY p.id DESC
    `);

    return res.json({ products: rows });
  } catch (error) {
    console.error('Get products error:', error);
    return res.status(500).json({ message: 'Lỗi lấy danh sách sản phẩm' });
  }
};

const createProduct = async (req, res) => {
  try {
    const {
      code,
      name,
      category_id,
      unit,
      cost_price,
      sale_price,
      min_stock,
      status,
      image_url,
      product_type,
      can_purchase,
      can_sell,
    } = req.body;

    if (!code || !name) {
      return res.status(400).json({ message: 'Thiếu mã hoặc tên sản phẩm' });
    }

    const [exists] = await pool.query(
      `SELECT id FROM products WHERE code = ? LIMIT 1`,
      [code]
    );

    if (exists.length > 0) {
      return res.status(409).json({ message: 'Mã sản phẩm đã tồn tại' });
    }

    const [result] = await pool.query(
      `
      INSERT INTO products (
        category_id,
        code,
        name,
        unit,
        cost_price,
        sale_price,
        stock_quantity,
        min_stock,
        image_url,
        product_type,
        can_purchase,
        can_sell,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
      `,
      [
        category_id || null,
        code,
        name,
        unit || 'cái',
        Number(cost_price || 0),
        Number(sale_price || 0),
        Number(min_stock || 0),
        image_url || null,
        product_type || 'ingredient',
        can_purchase ? 1 : 0,
        can_sell ? 1 : 0,
        status || 'active',
      ]
    );

    return res.status(201).json({
      message: 'Thêm sản phẩm thành công',
      id: result.insertId,
    });
  } catch (error) {
    console.error('Create product error:', error);
    return res.status(500).json({ message: 'Lỗi thêm sản phẩm' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      name,
      category_id,
      unit,
      cost_price,
      sale_price,
      min_stock,
      status,
      image_url,
      product_type,
      can_purchase,
      can_sell,
    } = req.body;

    if (!code || !name) {
      return res.status(400).json({ message: 'Thiếu mã hoặc tên sản phẩm' });
    }

    const [exists] = await pool.query(
      `SELECT id FROM products WHERE code = ? AND id <> ? LIMIT 1`,
      [code, id]
    );

    if (exists.length > 0) {
      return res.status(409).json({ message: 'Mã sản phẩm đã tồn tại' });
    }

    await pool.query(
      `
      UPDATE products
      SET
        category_id = ?,
        code = ?,
        name = ?,
        unit = ?,
        cost_price = ?,
        sale_price = ?,
        min_stock = ?,
        image_url = ?,
        product_type = ?,
        can_purchase = ?,
        can_sell = ?,
        status = ?
      WHERE id = ?
      `,
      [
        category_id || null,
        code,
        name,
        unit || 'cái',
        Number(cost_price || 0),
        Number(sale_price || 0),
        Number(min_stock || 0),
        image_url || null,
        product_type || 'ingredient',
        can_purchase ? 1 : 0,
        can_sell ? 1 : 0,
        status || 'active',
        id,
      ]
    );

    return res.json({ message: 'Cập nhật sản phẩm thành công' });
  } catch (error) {
    console.error('Update product error:', error);
    return res.status(500).json({ message: 'Lỗi cập nhật sản phẩm' });
  }
};

const updateProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    await pool.query(
      `UPDATE products SET status = ? WHERE id = ?`,
      [status, id]
    );

    return res.json({ message: 'Cập nhật trạng thái sản phẩm thành công' });
  } catch (error) {
    console.error('Update product status error:', error);
    return res.status(500).json({ message: 'Lỗi cập nhật trạng thái sản phẩm' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const [purchaseRows] = await pool.query(
      `SELECT id FROM purchase_receipt_items WHERE product_id = ? LIMIT 1`,
      [id]
    );

    if (purchaseRows.length > 0) {
      return res.status(400).json({
        message: 'Sản phẩm đã phát sinh phiếu nhập, chỉ có thể ngưng sử dụng',
      });
    }

    const [saleRows] = await pool.query(
      `SELECT id FROM sales_invoice_items WHERE product_id = ? LIMIT 1`,
      [id]
    );

    if (saleRows.length > 0) {
      return res.status(400).json({
        message: 'Sản phẩm đã phát sinh hóa đơn bán, chỉ có thể ngưng sử dụng',
      });
    }

    const [stockRows] = await pool.query(
      `SELECT id FROM stock_transactions WHERE product_id = ? LIMIT 1`,
      [id]
    );

    if (stockRows.length > 0) {
      return res.status(400).json({
        message: 'Sản phẩm đã phát sinh giao dịch kho, chỉ có thể ngưng sử dụng',
      });
    }

    await pool.query(`DELETE FROM products WHERE id = ?`, [id]);

    return res.json({ message: 'Xóa sản phẩm thành công' });
  } catch (error) {
    console.error('Delete product error:', error);
    return res.status(500).json({ message: 'Lỗi xóa sản phẩm' });
  }
};

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
};