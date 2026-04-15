const { pool } = require('../config/db');

const pad2 = (value) => String(value).padStart(2, '0');

const formatDateKey = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${year}-${month}-${day}`;
};

const sqlDateTime = (d) => {
  const year = d.getFullYear();
  const month = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const hour = pad2(d.getHours());
  const minute = pad2(d.getMinutes());
  const second = pad2(d.getSeconds());
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

const getQuarter = (monthIndex) => Math.floor(monthIndex / 3) + 1;

const getRangeDates = (range = 'week') => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (range === 'day') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (range === 'week') {
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);

    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (range === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    end.setMonth(start.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
  } else if (range === 'quarter') {
    const quarter = getQuarter(start.getMonth());
    const quarterStartMonth = (quarter - 1) * 3;

    start.setMonth(quarterStartMonth, 1);
    start.setHours(0, 0, 0, 0);

    end.setMonth(quarterStartMonth + 3, 0);
    end.setHours(23, 59, 59, 999);
  } else if (range === 'year') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);

    end.setMonth(11, 31);
    end.setHours(23, 59, 59, 999);
  } else {
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);

    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  }

  return {
    start: sqlDateTime(start),
    end: sqlDateTime(end),
  };
};

const buildBuckets = (range = 'week') => {
  const now = new Date();
  const buckets = [];

  if (range === 'day') {
    buckets.push({
      key: formatDateKey(now),
      label: 'Hôm nay',
      revenue: 0,
      cost: 0,
      gross_profit: 0,
      cashflow_profit: 0,
    });
    return buckets;
  }

  if (range === 'week') {
    const start = new Date(now);
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);

    const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);

      buckets.push({
        key: formatDateKey(d),
        label: labels[i],
        revenue: 0,
        cost: 0,
        gross_profit: 0,
        cashflow_profit: 0,
      });
    }

    return buckets;
  }

  if (range === 'month') {
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDate = new Date(year, month + 1, 0).getDate();

    for (let i = 1; i <= lastDate; i++) {
      const d = new Date(year, month, i);
      buckets.push({
        key: formatDateKey(d),
        label: `${i}`,
        revenue: 0,
        cost: 0,
        gross_profit: 0,
        cashflow_profit: 0,
      });
    }

    return buckets;
  }

  if (range === 'quarter') {
    const quarter = getQuarter(now.getMonth());
    const quarterStartMonth = (quarter - 1) * 3;

    for (let i = 0; i < 3; i++) {
      const month = quarterStartMonth + i + 1;
      buckets.push({
        key: `M${month}`,
        label: `T${month}`,
        revenue: 0,
        cost: 0,
        gross_profit: 0,
        cashflow_profit: 0,
      });
    }

    return buckets;
  }

  if (range === 'year') {
    for (let i = 1; i <= 12; i++) {
      buckets.push({
        key: `M${i}`,
        label: `T${i}`,
        revenue: 0,
        cost: 0,
        gross_profit: 0,
        cashflow_profit: 0,
      });
    }

    return buckets;
  }

  return buckets;
};

const getBucketKeyFromDate = (value, range = 'week') => {
  const d = new Date(value);

  if (range === 'quarter' || range === 'year') {
    return `M${d.getMonth() + 1}`;
  }

  return formatDateKey(d);
};

const getDashboardSummary = async (req, res) => {
  try {
    const { range = 'week' } = req.query;
    const { start, end } = getRangeDates(range);

    const [[salesSummary]] = await pool.query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) AS revenue_paid,
        COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN total_amount ELSE 0 END), 0) AS revenue_pending,
        COUNT(*) AS total_invoices,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END), 0) AS paid_invoices,
        COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_invoices
      FROM sales_invoices
      WHERE invoice_date BETWEEN ? AND ?
      `,
      [start, end]
    );

    const [[purchaseSummary]] = await pool.query(
      `
      SELECT
        COALESCE(SUM(total_amount), 0) AS total_cost,
        COUNT(*) AS total_purchases
      FROM purchase_receipts
      WHERE receipt_date BETWEEN ? AND ?
        AND status = 'completed'
      `,
      [start, end]
    );

    const [[grossProfitSummary]] = await pool.query(
      `
      SELECT
        COALESCE(SUM(sii.profit_amount), 0) AS gross_profit
      FROM sales_invoice_items sii
      JOIN sales_invoices si ON si.id = sii.invoice_id
      WHERE si.invoice_date BETWEEN ? AND ?
        AND si.payment_status = 'paid'
      `,
      [start, end]
    );

    const salesDateExpr =
      range === 'quarter' || range === 'year'
        ? 'DATE_FORMAT(invoice_date, "%Y-%m-01")'
        : 'DATE(invoice_date)';

    const purchaseDateExpr =
      range === 'quarter' || range === 'year'
        ? 'DATE_FORMAT(receipt_date, "%Y-%m-01")'
        : 'DATE(receipt_date)';

    const [salesByDate] = await pool.query(
      `
      SELECT
        ${salesDateExpr} AS bucket_date,
        COALESCE(SUM(total_amount), 0) AS revenue
      FROM sales_invoices
      WHERE invoice_date BETWEEN ? AND ?
        AND payment_status = 'paid'
      GROUP BY ${salesDateExpr}
      ORDER BY bucket_date ASC
      `,
      [start, end]
    );

    const [costByDate] = await pool.query(
      `
      SELECT
        ${purchaseDateExpr} AS bucket_date,
        COALESCE(SUM(total_amount), 0) AS cost
      FROM purchase_receipts
      WHERE receipt_date BETWEEN ? AND ?
        AND status = 'completed'
      GROUP BY ${purchaseDateExpr}
      ORDER BY bucket_date ASC
      `,
      [start, end]
    );

    const [grossProfitByDate] = await pool.query(
      `
      SELECT
        ${
          range === 'quarter' || range === 'year'
            ? 'DATE_FORMAT(si.invoice_date, "%Y-%m-01")'
            : 'DATE(si.invoice_date)'
        } AS bucket_date,
        COALESCE(SUM(sii.profit_amount), 0) AS gross_profit
      FROM sales_invoice_items sii
      JOIN sales_invoices si ON si.id = sii.invoice_id
      WHERE si.invoice_date BETWEEN ? AND ?
        AND si.payment_status = 'paid'
      GROUP BY ${
        range === 'quarter' || range === 'year'
          ? 'DATE_FORMAT(si.invoice_date, "%Y-%m-01")'
          : 'DATE(si.invoice_date)'
      }
      ORDER BY bucket_date ASC
      `,
      [start, end]
    );

    const buckets = buildBuckets(range);
    const bucketMap = new Map(buckets.map((item) => [item.key, item]));

    salesByDate.forEach((row) => {
      const key = getBucketKeyFromDate(row.bucket_date, range);
      const found = bucketMap.get(key);
      if (found) found.revenue = Number(row.revenue || 0);
    });

    costByDate.forEach((row) => {
      const key = getBucketKeyFromDate(row.bucket_date, range);
      const found = bucketMap.get(key);
      if (found) found.cost = Number(row.cost || 0);
    });

    grossProfitByDate.forEach((row) => {
      const key = getBucketKeyFromDate(row.bucket_date, range);
      const found = bucketMap.get(key);
      if (found) found.gross_profit = Number(row.gross_profit || 0);
    });

    buckets.forEach((item) => {
      item.cashflow_profit = Number(item.revenue || 0) - Number(item.cost || 0);
    });

    const [paymentMethods] = await pool.query(
      `
      SELECT
        pm.code,
        pm.name,
        COUNT(DISTINCT si.id) AS invoice_count,
        COALESCE(SUM(si.total_amount), 0) AS amount
      FROM sales_invoices si
      LEFT JOIN invoice_payments ip ON ip.invoice_id = si.id
      LEFT JOIN payment_methods pm ON pm.id = ip.payment_method_id
      WHERE si.invoice_date BETWEEN ? AND ?
        AND si.payment_status = 'paid'
      GROUP BY pm.code, pm.name
      ORDER BY amount DESC
      `,
      [start, end]
    );

    const [topProducts] = await pool.query(
      `
      SELECT
        p.id,
        p.name,
        p.unit,
        COALESCE(SUM(sii.quantity), 0) AS qty_sold,
        COALESCE(SUM(sii.line_total), 0) AS revenue
      FROM sales_invoice_items sii
      JOIN sales_invoices si ON si.id = sii.invoice_id
      JOIN products p ON p.id = sii.product_id
      WHERE si.invoice_date BETWEEN ? AND ?
        AND si.payment_status = 'paid'
      GROUP BY p.id, p.name, p.unit
      ORDER BY qty_sold DESC, revenue DESC
      LIMIT 5
      `,
      [start, end]
    );

    const [recentInvoices] = await pool.query(
      `
      SELECT
        si.id,
        si.invoice_no,
        si.customer_name,
        si.total_amount,
        si.invoice_date,
        si.payment_status,
        pm.code AS payment_method_code,
        pm.name AS payment_method_name
      FROM sales_invoices si
      LEFT JOIN invoice_payments ip ON ip.invoice_id = si.id
      LEFT JOIN payment_methods pm ON pm.id = ip.payment_method_id
      ORDER BY si.id DESC
      LIMIT 5
      `
    );

    const [lowStockProducts] = await pool.query(
      `
      SELECT
        id,
        code,
        name,
        unit,
        stock_quantity,
        min_stock
      FROM products
      WHERE status = 'active'
        AND can_purchase = 1
        AND stock_quantity <= min_stock
      ORDER BY stock_quantity ASC, name ASC
      LIMIT 10
      `
    );

    return res.json({
      summary: {
        revenue_paid: Number(salesSummary.revenue_paid || 0),
        revenue_pending: Number(salesSummary.revenue_pending || 0),
        total_cost: Number(purchaseSummary.total_cost || 0),
        gross_profit: Number(grossProfitSummary.gross_profit || 0),
        cashflow_profit:
          Number(salesSummary.revenue_paid || 0) -
          Number(purchaseSummary.total_cost || 0),
        total_invoices: Number(salesSummary.total_invoices || 0),
        paid_invoices: Number(salesSummary.paid_invoices || 0),
        pending_invoices: Number(salesSummary.pending_invoices || 0),
        total_purchases: Number(purchaseSummary.total_purchases || 0),
      },
      chart: buckets,
      payment_methods: paymentMethods.map((item) => ({
        code: item.code || 'unknown',
        name: item.name || 'Khác',
        invoice_count: Number(item.invoice_count || 0),
        amount: Number(item.amount || 0),
      })),
      top_products: topProducts.map((item) => ({
        id: item.id,
        name: item.name,
        unit: item.unit,
        qty_sold: Number(item.qty_sold || 0),
        revenue: Number(item.revenue || 0),
      })),
      recent_invoices: recentInvoices.map((item) => ({
        ...item,
        total_amount: Number(item.total_amount || 0),
      })),
      low_stock_products: lowStockProducts.map((item) => ({
        ...item,
        stock_quantity: Number(item.stock_quantity || 0),
        min_stock: Number(item.min_stock || 0),
      })),
    });
  } catch (error) {
    console.error('Get dashboard summary error FULL:', error);
    return res.status(500).json({
      message: 'Lỗi lấy dữ liệu báo cáo',
      error: error.message,
      sqlMessage: error.sqlMessage || null,
      code: error.code || null,
    });
  }
};

module.exports = {
  getDashboardSummary,
};