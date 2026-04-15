const { pool } = require('../config/db');

const getPurchases = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        pr.id,
        pr.receipt_no,
        pr.receipt_date,
        pr.total_amount,
        pr.note,
        pr.status,
        pr.created_by AS created_by_id,
        pr.supplier_id,
        s.name AS supplier_name,
        u.username AS created_by
      FROM purchase_receipts pr
      LEFT JOIN suppliers s ON pr.supplier_id = s.id
      JOIN users u ON pr.created_by = u.id
      ORDER BY pr.id DESC
    `);

    return res.json({ receipts: rows });
  } catch (error) {
    console.error('Get purchases error:', error);
    return res.status(500).json({ message: 'Lỗi lấy danh sách phiếu nhập' });
  }
};

const generateReceiptNo = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `PN-${y}${m}${d}-${h}${mi}${s}`;
};

const createPurchase = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const currentUserId = req.user.id || req.user.userId || req.user.user_id;

    if (!currentUserId) {
      await connection.rollback();
      return res.status(401).json({ message: 'Không xác định được người dùng đăng nhập' });
    }

    const { supplier_id, note, lines } = req.body;

    if (!supplier_id) {
      await connection.rollback();
      return res.status(400).json({ message: 'Vui lòng chọn nhà cung cấp' });
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Phiếu nhập phải có ít nhất một mặt hàng' });
    }

    for (const line of lines) {
      if (!line.product_id || Number(line.quantity) <= 0 || Number(line.unit_cost) < 0) {
        await connection.rollback();
        return res.status(400).json({ message: 'Dữ liệu mặt hàng nhập không hợp lệ' });
      }
    }

    const productIds = lines.map((line) => line.product_id);
    const placeholders = productIds.map(() => '?').join(',');

    const [products] = await connection.query(
      `
      SELECT id, name, unit, can_purchase, status
      FROM products
      WHERE id IN (${placeholders})
      `,
      productIds
    );

    const productMap = new Map(products.map((p) => [Number(p.id), p]));

    for (const line of lines) {
      const product = productMap.get(Number(line.product_id));

      if (!product) {
        await connection.rollback();
        return res.status(400).json({ message: 'Có sản phẩm không tồn tại trong hệ thống' });
      }

      if (product.status !== 'active') {
        await connection.rollback();
        return res.status(400).json({ message: `Sản phẩm "${product.name}" đang ngưng hoạt động` });
      }

      if (!product.can_purchase) {
        await connection.rollback();
        return res.status(400).json({
          message: `Sản phẩm "${product.name}" không được phép nhập kho`,
        });
      }
    }

    const receiptNo = generateReceiptNo();
    const totalAmount = lines.reduce(
      (sum, line) => sum + Number(line.quantity) * Number(line.unit_cost),
      0
    );

    const [receiptResult] = await connection.query(
      `
      INSERT INTO purchase_receipts (
        receipt_no,
        supplier_id,
        created_by,
        receipt_date,
        total_amount,
        note,
        status
      )
      VALUES (?, ?, ?, NOW(), ?, ?, 'completed')
      `,
      [receiptNo, supplier_id, currentUserId, totalAmount, note || null]
    );

    const receiptId = receiptResult.insertId;

    for (const line of lines) {
      const quantity = Number(line.quantity);
      const unitCost = Number(line.unit_cost);
      const lineTotal = quantity * unitCost;

      await connection.query(
        `
        INSERT INTO purchase_receipt_items (
          receipt_id,
          product_id,
          quantity,
          unit_cost,
          line_total
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [receiptId, line.product_id, quantity, unitCost, lineTotal]
      );

      await connection.query(
        `
        UPDATE products
        SET stock_quantity = stock_quantity + ?
        WHERE id = ?
        `,
        [quantity, line.product_id]
      );

      const [[productAfter]] = await connection.query(
        `SELECT stock_quantity FROM products WHERE id = ?`,
        [line.product_id]
      );

      await connection.query(
        `
        INSERT INTO stock_transactions (
          product_id,
          transaction_type,
          ref_type,
          ref_id,
          quantity_change,
          balance_after,
          note,
          created_by
        )
        VALUES (?, 'purchase_in', 'purchase_receipt', ?, ?, ?, ?, ?)
        `,
        [
          line.product_id,
          receiptId,
          quantity,
          Number(productAfter.stock_quantity),
          note || 'Nhập hàng',
          currentUserId,
        ]
      );
    }

    await connection.commit();

    return res.status(201).json({
      message: 'Tạo phiếu nhập thành công',
      receipt_id: receiptId,
      receipt_no: receiptNo,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create purchase error FULL:', error);
    return res.status(500).json({
      message: 'Lỗi tạo phiếu nhập',
      error: error.message,
      sqlMessage: error.sqlMessage || null,
      code: error.code || null,
    });
  } finally {
    connection.release();
  }
};

const updatePurchase = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const currentUserId = req.user.id || req.user.userId || req.user.user_id;
    const { supplier_id, note, lines } = req.body;

    const [[receipt]] = await connection.query(
      `SELECT id, created_by FROM purchase_receipts WHERE id = ?`,
      [id]
    );

    if (!receipt) {
      await connection.rollback();
      return res.status(404).json({ message: 'Không tìm thấy phiếu nhập' });
    }

    const isAdmin = req.user.role_code === 'admin' || req.user.roleCode === 'admin';
    if (!isAdmin && Number(receipt.created_by) !== Number(currentUserId)) {
      await connection.rollback();
      return res.status(403).json({ message: 'Bạn không có quyền sửa phiếu nhập này' });
    }

    if (!supplier_id) {
      await connection.rollback();
      return res.status(400).json({ message: 'Vui lòng chọn nhà cung cấp' });
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Phiếu nhập phải có ít nhất một mặt hàng' });
    }

    for (const line of lines) {
      if (!line.product_id || Number(line.quantity) <= 0 || Number(line.unit_cost) < 0) {
        await connection.rollback();
        return res.status(400).json({ message: 'Dữ liệu mặt hàng nhập không hợp lệ' });
      }
    }

    const [oldItems] = await connection.query(
      `
      SELECT product_id, quantity
      FROM purchase_receipt_items
      WHERE receipt_id = ?
      `,
      [id]
    );

    for (const item of oldItems) {
      await connection.query(
        `
        UPDATE products
        SET stock_quantity = stock_quantity - ?
        WHERE id = ?
        `,
        [Number(item.quantity), item.product_id]
      );
    }

    await connection.query(
      `DELETE FROM stock_transactions WHERE ref_type = 'purchase_receipt' AND ref_id = ?`,
      [id]
    );

    await connection.query(
      `DELETE FROM purchase_receipt_items WHERE receipt_id = ?`,
      [id]
    );

    const productIds = lines.map((line) => line.product_id);
    const placeholders = productIds.map(() => '?').join(',');

    const [products] = await connection.query(
      `
      SELECT id, name, unit, can_purchase, status
      FROM products
      WHERE id IN (${placeholders})
      `,
      productIds
    );

    const productMap = new Map(products.map((p) => [Number(p.id), p]));

    for (const line of lines) {
      const product = productMap.get(Number(line.product_id));

      if (!product) {
        await connection.rollback();
        return res.status(400).json({ message: 'Có sản phẩm không tồn tại trong hệ thống' });
      }

      if (product.status !== 'active') {
        await connection.rollback();
        return res.status(400).json({ message: `Sản phẩm "${product.name}" đang ngưng hoạt động` });
      }

      if (!product.can_purchase) {
        await connection.rollback();
        return res.status(400).json({
          message: `Sản phẩm "${product.name}" không được phép nhập kho`,
        });
      }
    }

    const totalAmount = lines.reduce(
      (sum, line) => sum + Number(line.quantity) * Number(line.unit_cost),
      0
    );

    await connection.query(
      `
      UPDATE purchase_receipts
      SET supplier_id = ?, total_amount = ?, note = ?
      WHERE id = ?
      `,
      [supplier_id, totalAmount, note || null, id]
    );

    for (const line of lines) {
      const quantity = Number(line.quantity);
      const unitCost = Number(line.unit_cost);
      const lineTotal = quantity * unitCost;

      await connection.query(
        `
        INSERT INTO purchase_receipt_items (
          receipt_id,
          product_id,
          quantity,
          unit_cost,
          line_total
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [id, line.product_id, quantity, unitCost, lineTotal]
      );

      await connection.query(
        `
        UPDATE products
        SET stock_quantity = stock_quantity + ?
        WHERE id = ?
        `,
        [quantity, line.product_id]
      );

      const [[productAfter]] = await connection.query(
        `SELECT stock_quantity FROM products WHERE id = ?`,
        [line.product_id]
      );

      await connection.query(
        `
        INSERT INTO stock_transactions (
          product_id,
          transaction_type,
          ref_type,
          ref_id,
          quantity_change,
          balance_after,
          note,
          created_by
        )
        VALUES (?, 'purchase_in', 'purchase_receipt', ?, ?, ?, ?, ?)
        `,
        [
          line.product_id,
          id,
          quantity,
          Number(productAfter.stock_quantity),
          note || 'Sửa phiếu nhập',
          currentUserId,
        ]
      );
    }

    await connection.commit();

    return res.json({ message: 'Cập nhật phiếu nhập thành công' });
  } catch (error) {
    await connection.rollback();
    console.error('Update purchase error FULL:', error);
    return res.status(500).json({
      message: 'Lỗi sửa phiếu nhập',
      error: error.message,
      sqlMessage: error.sqlMessage || null,
      code: error.code || null,
    });
  } finally {
    connection.release();
  }
};

const deletePurchase = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const currentUserId = req.user.id || req.user.userId || req.user.user_id;

    const [[receipt]] = await connection.query(
      `SELECT id, created_by FROM purchase_receipts WHERE id = ?`,
      [id]
    );

    if (!receipt) {
      await connection.rollback();
      return res.status(404).json({ message: 'Không tìm thấy phiếu nhập' });
    }

    const isAdmin = req.user.role_code === 'admin' || req.user.roleCode === 'admin';
    if (!isAdmin && Number(receipt.created_by) !== Number(currentUserId)) {
      await connection.rollback();
      return res.status(403).json({ message: 'Bạn không có quyền xóa phiếu nhập này' });
    }

    const [items] = await connection.query(
      `
      SELECT product_id, quantity
      FROM purchase_receipt_items
      WHERE receipt_id = ?
      `,
      [id]
    );

    for (const item of items) {
      await connection.query(
        `
        UPDATE products
        SET stock_quantity = stock_quantity - ?
        WHERE id = ?
        `,
        [Number(item.quantity), item.product_id]
      );
    }

    await connection.query(
      `DELETE FROM stock_transactions WHERE ref_type = 'purchase_receipt' AND ref_id = ?`,
      [id]
    );

    await connection.query(`DELETE FROM purchase_receipt_items WHERE receipt_id = ?`, [id]);
    await connection.query(`DELETE FROM purchase_receipts WHERE id = ?`, [id]);

    await connection.commit();

    return res.json({ message: 'Xóa phiếu nhập thành công' });
  } catch (error) {
    await connection.rollback();
    console.error('Delete purchase error:', error);
    return res.status(500).json({ message: 'Lỗi xóa phiếu nhập' });
  } finally {
    connection.release();
  }
};

const getPurchaseById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[receipt]] = await pool.query(
      `
      SELECT
        pr.id,
        pr.receipt_no,
        pr.receipt_date,
        pr.total_amount,
        pr.note,
        pr.status,
        pr.supplier_id,
        pr.created_by AS created_by_id,
        s.name AS supplier_name,
        u.username AS created_by
      FROM purchase_receipts pr
      LEFT JOIN suppliers s ON pr.supplier_id = s.id
      JOIN users u ON pr.created_by = u.id
      WHERE pr.id = ?
      `,
      [id]
    );

    if (!receipt) {
      return res.status(404).json({ message: 'Không tìm thấy phiếu nhập' });
    }

    const [items] = await pool.query(
      `
      SELECT
        pri.product_id,
        p.name AS product_name,
        p.unit,
        pri.quantity,
        pri.unit_cost,
        pri.line_total
      FROM purchase_receipt_items pri
      JOIN products p ON pri.product_id = p.id
      WHERE pri.receipt_id = ?
      ORDER BY pri.id ASC
      `,
      [id]
    );

    return res.json({
      receipt: {
        ...receipt,
        lines: items,
      },
    });
  } catch (error) {
    console.error('Get purchase by id error:', error);
    return res.status(500).json({ message: 'Lỗi lấy chi tiết phiếu nhập' });
  }
};

module.exports = {
  getPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  deletePurchase,
};