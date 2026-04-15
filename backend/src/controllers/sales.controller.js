const { pool } = require('../config/db');

const generateInvoiceNo = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `HD-${y}${m}${d}-${h}${mi}${s}`;
};

const getPaymentMethodIdByCode = async (connection, code) => {
  const methodCode = code === 'bank_transfer' ? 'bank_qr' : code || 'cash';

  const [[row]] = await connection.query(
    `SELECT id FROM payment_methods WHERE code = ? LIMIT 1`,
    [methodCode]
  );

  if (!row) {
    throw new Error(`Không tìm thấy phương thức thanh toán: ${methodCode}`);
  }

  return row.id;
};

const getSalesInvoices = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        si.id,
        si.invoice_no,
        si.invoice_date,
        si.created_at,
        si.customer_name,
        si.subtotal,
        si.discount_amount,
        si.total_amount,
        si.amount_paid,
        si.change_amount,
        si.note,
        si.status,
        si.payment_status,
        si.sold_by AS created_by_id,
        u.username AS created_by,
        pm.code AS payment_method_code,
        pm.name AS payment_method_name
      FROM sales_invoices si
      JOIN users u ON si.sold_by = u.id
      LEFT JOIN invoice_payments ip ON ip.invoice_id = si.id
      LEFT JOIN payment_methods pm ON pm.id = ip.payment_method_id
      ORDER BY si.id DESC
    `);

    return res.json({ invoices: rows });
  } catch (error) {
    console.error('Get sales invoices error:', error);
    return res.status(500).json({ message: 'Lỗi lấy danh sách hóa đơn bán' });
  }
};

const getSalesInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[invoice]] = await pool.query(
      `
      SELECT
        si.id,
        si.invoice_no,
        si.invoice_date,
        si.created_at,
        si.customer_name,
        si.subtotal,
        si.discount_amount,
        si.total_amount,
        si.amount_paid,
        si.change_amount,
        si.note,
        si.status,
        si.payment_status,
        si.sold_by AS created_by_id,
        u.username AS created_by,
        pm.code AS payment_method_code,
        pm.name AS payment_method_name
      FROM sales_invoices si
      JOIN users u ON si.sold_by = u.id
      LEFT JOIN invoice_payments ip ON ip.invoice_id = si.id
      LEFT JOIN payment_methods pm ON pm.id = ip.payment_method_id
      WHERE si.id = ?
      `,
      [id]
    );

    if (!invoice) {
      return res.status(404).json({ message: 'Không tìm thấy hóa đơn' });
    }

    const [items] = await pool.query(
      `
      SELECT
        sii.product_id,
        p.name AS product_name,
        p.unit,
        sii.quantity,
        sii.unit_price,
        sii.unit_cost,
        sii.line_discount,
        sii.line_total,
        sii.profit_amount
      FROM sales_invoice_items sii
      JOIN products p ON sii.product_id = p.id
      WHERE sii.invoice_id = ?
      ORDER BY sii.id ASC
      `,
      [id]
    );

    return res.json({
      invoice: {
        ...invoice,
        lines: items,
      },
    });
  } catch (error) {
    console.error('Get sales invoice by id error:', error);
    return res.status(500).json({ message: 'Lỗi lấy chi tiết hóa đơn' });
  }
};

const createSalesInvoice = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const currentUserId = req.user.id || req.user.userId || req.user.user_id;

    const {
      customer_name,
      note,
      discount_amount,
      payment_method,
      customer_paid,
      change_amount,
      lines,
    } = req.body;

    if (!currentUserId) {
      await connection.rollback();
      return res.status(401).json({ message: 'Không xác định được người dùng đăng nhập' });
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Hóa đơn phải có ít nhất một sản phẩm' });
    }

    for (const line of lines) {
      if (
        !line.product_id ||
        Number(line.quantity) <= 0 ||
        Number(line.unit_price) < 0 ||
        Number(line.discount_amount || 0) < 0
      ) {
        await connection.rollback();
        return res.status(400).json({ message: 'Dữ liệu dòng sản phẩm không hợp lệ' });
      }
    }

    const productIds = lines.map((line) => line.product_id);
    const placeholders = productIds.map(() => '?').join(',');

    const [products] = await connection.query(
      `
      SELECT
        id,
        name,
        unit,
        cost_price,
        sale_price,
        stock_quantity,
        status,
        product_type,
        can_sell
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
        return res.status(400).json({
          message: `Sản phẩm "${product.name}" đang ngưng hoạt động`,
        });
      }

      if (!product.can_sell) {
        await connection.rollback();
        return res.status(400).json({
          message: `Sản phẩm "${product.name}" không được phép bán`,
        });
      }

      const type = product.product_type || 'drink';

      if (type === 'drink' || type === 'supply') {
        if (Number(line.quantity) > Number(product.stock_quantity || 0)) {
          await connection.rollback();
          return res.status(400).json({
            message: `Sản phẩm "${product.name}" không đủ tồn kho`,
          });
        }
      }
    }

    const subtotal = lines.reduce(
      (sum, line) => sum + Number(line.quantity) * Number(line.unit_price),
      0
    );

    const invoiceDiscount = Number(discount_amount || 0);
    const totalAmount = Math.max(0, subtotal - invoiceDiscount);
    const amountPaid =
      payment_method === 'cash' ? Number(customer_paid || 0) : totalAmount;
    const changeAmount =
      payment_method === 'cash' ? Number(change_amount || 0) : 0;

    if (payment_method === 'cash' && amountPaid < totalAmount) {
      await connection.rollback();
      return res.status(400).json({ message: 'Số tiền khách trả không đủ' });
    }

    const invoiceNo = generateInvoiceNo();
    const paymentStatus = payment_method === 'bank_transfer' ? 'pending' : 'paid';

    const [invoiceResult] = await connection.query(
      `
      INSERT INTO sales_invoices (
        invoice_no,
        customer_name,
        sold_by,
        invoice_date,
        subtotal,
        discount_amount,
        total_amount,
        amount_paid,
        change_amount,
        payment_status,
        note,
        status
      )
      VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, 'completed')
      `,
      [
        invoiceNo,
        customer_name || 'Khách lẻ',
        currentUserId,
        subtotal,
        invoiceDiscount,
        totalAmount,
        amountPaid,
        changeAmount,
        paymentStatus,
        note || null,
      ]
    );

    const invoiceId = invoiceResult.insertId;

    for (const line of lines) {
      const product = productMap.get(Number(line.product_id));
      const qty = Number(line.quantity);
      const unitPrice = Number(line.unit_price);
      const unitCost = Number(product.cost_price || 0);
      const lineDiscount = Number(line.discount_amount || 0);
      const lineTotal = qty * unitPrice - lineDiscount;
      const profitAmount = lineTotal - qty * unitCost;

      await connection.query(
        `
        INSERT INTO sales_invoice_items (
          invoice_id,
          product_id,
          quantity,
          unit_price,
          unit_cost,
          line_discount,
          line_total,
          profit_amount
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          invoiceId,
          line.product_id,
          qty,
          unitPrice,
          unitCost,
          lineDiscount,
          lineTotal,
          profitAmount,
        ]
      );

      const type = product.product_type || 'drink';

      if (type === 'drink' || type === 'supply') {
        await connection.query(
          `
          UPDATE products
          SET stock_quantity = stock_quantity - ?
          WHERE id = ?
          `,
          [qty, line.product_id]
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
          VALUES (?, 'sale_out', 'sales_invoice', ?, ?, ?, ?, ?)
          `,
          [
            line.product_id,
            invoiceId,
            -qty,
            Number(productAfter.stock_quantity),
            note || 'Bán hàng',
            currentUserId,
          ]
        );
      }
    }

    const paymentMethodId = await getPaymentMethodIdByCode(
      connection,
      payment_method || 'cash'
    );

    await connection.query(
      `
      INSERT INTO invoice_payments (
        invoice_id,
        payment_method_id,
        amount,
        transaction_ref,
        paid_at,
        confirmed_by,
        note
      )
      VALUES (?, ?, ?, ?, NOW(), ?, ?)
      `,
      [
        invoiceId,
        paymentMethodId,
        totalAmount,
        null,
        currentUserId,
        note || null,
      ]
    );

    await connection.commit();

    return res.status(201).json({
      message: 'Tạo hóa đơn thành công',
      invoice_id: invoiceId,
      invoice_no: invoiceNo,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create sales invoice error FULL:', error);
    return res.status(500).json({
      message: 'Lỗi tạo hóa đơn bán',
      error: error.message,
      sqlMessage: error.sqlMessage || null,
      code: error.code || null,
    });
  } finally {
    connection.release();
  }
};

const updateSalesInvoice = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const currentUserId = req.user.id || req.user.userId || req.user.user_id;
    const isAdmin = req.user.role_code === 'admin' || req.user.roleCode === 'admin';
    const { id } = req.params;

    const {
      customer_name,
      note,
      discount_amount,
      payment_method,
      customer_paid,
      change_amount,
      lines,
    } = req.body;

    const [[invoice]] = await connection.query(
      `
      SELECT id, sold_by, status, invoice_date
      FROM sales_invoices
      WHERE id = ?
      `,
      [id]
    );

    if (!invoice) {
      await connection.rollback();
      return res.status(404).json({ message: 'Không tìm thấy hóa đơn' });
    }

    if (!isAdmin && Number(invoice.sold_by) !== Number(currentUserId)) {
      await connection.rollback();
      return res.status(403).json({ message: 'Bạn không có quyền sửa hóa đơn này' });
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Hóa đơn phải có ít nhất một sản phẩm' });
    }

    for (const line of lines) {
      if (
        !line.product_id ||
        Number(line.quantity) <= 0 ||
        Number(line.unit_price) < 0 ||
        Number(line.discount_amount || 0) < 0
      ) {
        await connection.rollback();
        return res.status(400).json({ message: 'Dữ liệu dòng sản phẩm không hợp lệ' });
      }
    }

    const [oldItems] = await connection.query(
      `
      SELECT
        sii.product_id,
        sii.quantity,
        p.product_type
      FROM sales_invoice_items sii
      JOIN products p ON p.id = sii.product_id
      WHERE sii.invoice_id = ?
      `,
      [id]
    );

    for (const item of oldItems) {
      const type = item.product_type || 'drink';

      if (type === 'drink' || type === 'supply') {
        await connection.query(
          `
          UPDATE products
          SET stock_quantity = stock_quantity + ?
          WHERE id = ?
          `,
          [Number(item.quantity), item.product_id]
        );
      }
    }

    await connection.query(
      `DELETE FROM stock_transactions WHERE ref_type = 'sales_invoice' AND ref_id = ?`,
      [id]
    );

    await connection.query(
      `DELETE FROM sales_invoice_items WHERE invoice_id = ?`,
      [id]
    );

    await connection.query(
      `DELETE FROM invoice_payments WHERE invoice_id = ?`,
      [id]
    );

    const productIds = lines.map((line) => line.product_id);
    const placeholders = productIds.map(() => '?').join(',');

    const [products] = await connection.query(
      `
      SELECT
        id,
        name,
        unit,
        cost_price,
        sale_price,
        stock_quantity,
        status,
        product_type,
        can_sell
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
        return res.status(400).json({
          message: `Sản phẩm "${product.name}" đang ngưng hoạt động`,
        });
      }

      if (!product.can_sell) {
        await connection.rollback();
        return res.status(400).json({
          message: `Sản phẩm "${product.name}" không được phép bán`,
        });
      }

      const type = product.product_type || 'drink';

      if (type === 'drink' || type === 'supply') {
        if (Number(line.quantity) > Number(product.stock_quantity || 0)) {
          await connection.rollback();
          return res.status(400).json({
            message: `Sản phẩm "${product.name}" không đủ tồn kho`,
          });
        }
      }
    }

    const subtotal = lines.reduce(
      (sum, line) => sum + Number(line.quantity) * Number(line.unit_price),
      0
    );

    const invoiceDiscount = Number(discount_amount || 0);
    const totalAmount = Math.max(0, subtotal - invoiceDiscount);
    const amountPaid =
      payment_method === 'cash' ? Number(customer_paid || 0) : totalAmount;
    const changeAmount =
      payment_method === 'cash' ? Number(change_amount || 0) : 0;

    if (payment_method === 'cash' && amountPaid < totalAmount) {
      await connection.rollback();
      return res.status(400).json({ message: 'Số tiền khách trả không đủ' });
    }

    const paymentStatus = payment_method === 'bank_transfer' ? 'pending' : 'paid';

    await connection.query(
      `
      UPDATE sales_invoices
      SET
        customer_name = ?,
        subtotal = ?,
        discount_amount = ?,
        total_amount = ?,
        amount_paid = ?,
        change_amount = ?,
        payment_status = ?,
        note = ?
      WHERE id = ?
      `,
      [
        customer_name || 'Khách lẻ',
        subtotal,
        invoiceDiscount,
        totalAmount,
        amountPaid,
        changeAmount,
        paymentStatus,
        note || null,
        id,
      ]
    );

    for (const line of lines) {
      const product = productMap.get(Number(line.product_id));
      const qty = Number(line.quantity);
      const unitPrice = Number(line.unit_price);
      const unitCost = Number(product.cost_price || 0);
      const lineDiscount = Number(line.discount_amount || 0);
      const lineTotal = qty * unitPrice - lineDiscount;
      const profitAmount = lineTotal - qty * unitCost;

      await connection.query(
        `
        INSERT INTO sales_invoice_items (
          invoice_id,
          product_id,
          quantity,
          unit_price,
          unit_cost,
          line_discount,
          line_total,
          profit_amount
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          id,
          line.product_id,
          qty,
          unitPrice,
          unitCost,
          lineDiscount,
          lineTotal,
          profitAmount,
        ]
      );

      const type = product.product_type || 'drink';

      if (type === 'drink' || type === 'supply') {
        await connection.query(
          `
          UPDATE products
          SET stock_quantity = stock_quantity - ?
          WHERE id = ?
          `,
          [qty, line.product_id]
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
          VALUES (?, 'sale_out', 'sales_invoice', ?, ?, ?, ?, ?)
          `,
          [
            line.product_id,
            id,
            -qty,
            Number(productAfter.stock_quantity),
            note || 'Sửa hóa đơn bán',
            currentUserId,
          ]
        );
      }
    }

    const paymentMethodId = await getPaymentMethodIdByCode(
      connection,
      payment_method || 'cash'
    );

    await connection.query(
      `
      INSERT INTO invoice_payments (
        invoice_id,
        payment_method_id,
        amount,
        transaction_ref,
        paid_at,
        confirmed_by,
        note
      )
      VALUES (?, ?, ?, ?, NOW(), ?, ?)
      `,
      [
        id,
        paymentMethodId,
        totalAmount,
        null,
        currentUserId,
        note || null,
      ]
    );

    await connection.commit();

    return res.json({ message: 'Cập nhật hóa đơn thành công' });
  } catch (error) {
    await connection.rollback();
    console.error('Update sales invoice error FULL:', error);
    return res.status(500).json({
      message: 'Lỗi cập nhật hóa đơn',
      error: error.message,
      sqlMessage: error.sqlMessage || null,
      code: error.code || null,
    });
  } finally {
    connection.release();
  }
};

const confirmSalesInvoicePayment = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const currentUserId = req.user.id || req.user.userId || req.user.user_id;
    const isAdmin = req.user.role_code === 'admin' || req.user.roleCode === 'admin';
    const { id } = req.params;

    const [[invoice]] = await connection.query(
      `
      SELECT
        si.id,
        si.sold_by,
        si.payment_status,
        pm.code AS payment_method_code
      FROM sales_invoices si
      LEFT JOIN invoice_payments ip ON ip.invoice_id = si.id
      LEFT JOIN payment_methods pm ON pm.id = ip.payment_method_id
      WHERE si.id = ?
      `,
      [id]
    );

    if (!invoice) {
      await connection.rollback();
      return res.status(404).json({ message: 'Không tìm thấy hóa đơn' });
    }

    if (!isAdmin && Number(invoice.sold_by) !== Number(currentUserId)) {
      await connection.rollback();
      return res.status(403).json({ message: 'Bạn không có quyền xác nhận hóa đơn này' });
    }

    if (invoice.payment_method_code !== 'bank_qr') {
      await connection.rollback();
      return res.status(400).json({ message: 'Chỉ hóa đơn chuyển khoản mới cần xác nhận' });
    }

    if (invoice.payment_status === 'paid') {
      await connection.rollback();
      return res.status(400).json({ message: 'Hóa đơn này đã được xác nhận thanh toán' });
    }

    await connection.query(
      `
      UPDATE sales_invoices
      SET payment_status = 'paid'
      WHERE id = ?
      `,
      [id]
    );

    await connection.commit();

    return res.json({ message: 'Xác nhận thanh toán thành công' });
  } catch (error) {
    await connection.rollback();
    console.error('Confirm sales invoice payment error:', error);
    return res.status(500).json({
      message: 'Lỗi xác nhận thanh toán',
      error: error.message,
      sqlMessage: error.sqlMessage || null,
      code: error.code || null,
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  getSalesInvoices,
  getSalesInvoiceById,
  createSalesInvoice,
  updateSalesInvoice,
  confirmSalesInvoicePayment,
};