CREATE DATABASE IF NOT EXISTS revenue_management
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE revenue_management;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS stock_transactions;
DROP TABLE IF EXISTS invoice_payments;
DROP TABLE IF EXISTS payment_methods;
DROP TABLE IF EXISTS sales_invoice_items;
DROP TABLE IF EXISTS sales_invoices;
DROP TABLE IF EXISTS purchase_receipt_items;
DROP TABLE IF EXISTS purchase_receipts;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS product_categories;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================
-- 1. PHÂN QUYỀN
-- =========================

CREATE TABLE roles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO roles (code, name) VALUES
('admin', 'Quản trị'),
('staff', 'Nhân viên');

CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    role_id BIGINT NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NULL,
    email VARCHAR(150) NULL UNIQUE,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    last_login_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

-- =========================
-- 2. DANH MỤC SẢN PHẨM
-- =========================

CREATE TABLE product_categories (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO product_categories (code, name, description) VALUES
('NL_CA', 'Cá hải sản', 'Nguyên liệu cá, tôm, mực'),
('NL_THIT', 'Thịt', 'Nguyên liệu thịt bò, heo, gà'),
('NL_RAU', 'Rau củ', 'Nguyên liệu rau củ quả'),
('NL_GIAVI', 'Gia vị', 'Gia vị, nước chấm, dầu ăn'),
('NL_GAO_BUN', 'Gạo bún mì', 'Gạo, bún, mì, nui'),
('MON_CHINH', 'Món chính', 'Các món bán cho khách'),
('MON_PHU', 'Món phụ', 'Món ăn kèm, món nhẹ'),
('DO_UONG', 'Đồ uống', 'Nước suối, nước ngọt, bia'),
('VAT_TU', 'Vật tư', 'Hộp xốp, khăn giấy, ống hút');

-- =========================
-- 3. SẢN PHẨM / KHO
-- =========================
-- product_type:
-- ingredient = nguyên liệu
-- dish       = món ăn
-- drink      = đồ uống
-- supply     = vật tư

CREATE TABLE products (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    category_id BIGINT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    product_type ENUM('ingredient', 'dish', 'drink', 'supply') NOT NULL DEFAULT 'ingredient',
    unit VARCHAR(50) NOT NULL DEFAULT 'cái',
    image_url VARCHAR(255) NULL,
    description TEXT NULL,

    cost_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    sale_price DECIMAL(15,2) NOT NULL DEFAULT 0,

    stock_quantity DECIMAL(15,2) NOT NULL DEFAULT 0,
    min_stock DECIMAL(15,2) NOT NULL DEFAULT 0,

    can_purchase TINYINT(1) NOT NULL DEFAULT 1,
    can_sell TINYINT(1) NOT NULL DEFAULT 0,

    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES product_categories(id)
) ENGINE=InnoDB;

-- =========================
-- 4. NHÀ CUNG CẤP
-- =========================

CREATE TABLE suppliers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20) NULL,
    email VARCHAR(150) NULL,
    address VARCHAR(255) NULL,
    note VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =========================
-- 5. NHẬP HÀNG
-- =========================

CREATE TABLE purchase_receipts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    receipt_no VARCHAR(50) NOT NULL UNIQUE,
    supplier_id BIGINT NULL,
    created_by BIGINT NOT NULL,
    receipt_date DATETIME NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    note VARCHAR(255) NULL,
    status ENUM('draft', 'completed', 'cancelled') NOT NULL DEFAULT 'completed',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_purchase_receipts_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    CONSTRAINT fk_purchase_receipts_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE purchase_receipt_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    receipt_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity DECIMAL(15,2) NOT NULL,
    unit_cost DECIMAL(15,2) NOT NULL,
    line_total DECIMAL(15,2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_purchase_receipt_items_receipt FOREIGN KEY (receipt_id) REFERENCES purchase_receipts(id) ON DELETE CASCADE,
    CONSTRAINT fk_purchase_receipt_items_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- =========================
-- 6. BÁN HÀNG / HÓA ĐƠN
-- =========================

CREATE TABLE sales_invoices (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    invoice_no VARCHAR(50) NOT NULL UNIQUE,
    customer_name VARCHAR(150) NULL,
    sold_by BIGINT NOT NULL,
    invoice_date DATETIME NOT NULL,

    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,

    amount_paid DECIMAL(15,2) NOT NULL DEFAULT 0,
    change_amount DECIMAL(15,2) NOT NULL DEFAULT 0,

    payment_status ENUM('unpaid', 'partial', 'paid') NOT NULL DEFAULT 'paid',
    note VARCHAR(255) NULL,
    status ENUM('draft', 'completed', 'cancelled') NOT NULL DEFAULT 'completed',
    printed_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_sales_invoices_user FOREIGN KEY (sold_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE sales_invoice_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    invoice_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity DECIMAL(15,2) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    unit_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    line_discount DECIMAL(15,2) NOT NULL DEFAULT 0,
    line_total DECIMAL(15,2) NOT NULL,
    profit_amount DECIMAL(15,2) NOT NULL DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_sales_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE,
    CONSTRAINT fk_sales_invoice_items_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- =========================
-- 7. THANH TOÁN
-- =========================

CREATE TABLE payment_methods (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO payment_methods (code, name) VALUES
('cash', 'Tiền mặt'),
('bank_qr', 'Chuyển khoản QR'),
('pos', 'Thanh toán POS');

CREATE TABLE invoice_payments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    invoice_id BIGINT NOT NULL,
    payment_method_id BIGINT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    transaction_ref VARCHAR(100) NULL,
    paid_at DATETIME NOT NULL,
    confirmed_by BIGINT NOT NULL,
    note VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_invoice_payments_invoice FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE,
    CONSTRAINT fk_invoice_payments_method FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id),
    CONSTRAINT fk_invoice_payments_user FOREIGN KEY (confirmed_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- =========================
-- 8. BIẾN ĐỘNG KHO
-- =========================

CREATE TABLE stock_transactions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    transaction_type ENUM('purchase_in', 'sale_out', 'adjust_in', 'adjust_out') NOT NULL,
    ref_type ENUM('purchase_receipt', 'sales_invoice', 'manual_adjustment') NOT NULL,
    ref_id BIGINT NOT NULL,
    quantity_change DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    note VARCHAR(255) NULL,
    created_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_stock_transactions_product FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_stock_transactions_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- =========================
-- 9. CẤU HÌNH HỆ THỐNG
-- =========================

CREATE TABLE system_settings (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NULL,
    description VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('store_name', 'Quán ăn gia đình', 'Tên cửa hàng/quán'),
('store_address', '', 'Địa chỉ cửa hàng'),
('store_phone', '', 'Số điện thoại cửa hàng'),
('bill_footer', 'Cảm ơn quý khách!', 'Chân trang bill');

-- =========================
-- 10. NHẬT KÝ HỆ THỐNG
-- =========================

CREATE TABLE audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id BIGINT NULL,
    ip_address VARCHAR(45) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- =========================
-- 11. INDEX
-- =========================

CREATE INDEX idx_sales_invoices_date ON sales_invoices(invoice_date);
CREATE INDEX idx_purchase_receipts_date ON purchase_receipts(receipt_date);
CREATE INDEX idx_invoice_payments_paid_at ON invoice_payments(paid_at);
CREATE INDEX idx_stock_transactions_product_date ON stock_transactions(product_id, created_at);
CREATE INDEX idx_products_type_status ON products(product_type, status);
CREATE INDEX idx_products_sell_purchase ON products(can_sell, can_purchase);

-- =========================
-- 12. DỮ LIỆU MẪU
-- =========================

INSERT INTO suppliers (name, phone, address, note) VALUES
('Nhà cung cấp A', '0900000001', 'Cần Thơ', 'Nhập nguyên liệu'),
('Nhà cung cấp B', '0900000002', 'Cần Thơ', 'Nhập nước uống');

INSERT INTO products (
    category_id, code, name, product_type, unit, image_url, description,
    cost_price, sale_price, stock_quantity, min_stock,
    can_purchase, can_sell, status
) VALUES
(
    (SELECT id FROM product_categories WHERE code = 'NL_CA' LIMIT 1),
    'NL001', 'Cá basa', 'ingredient', 'kg', NULL, 'Nguyên liệu cá',
    80000, 0, 20, 5,
    1, 0, 'active'
),
(
    (SELECT id FROM product_categories WHERE code = 'NL_THIT' LIMIT 1),
    'NL002', 'Thịt bò', 'ingredient', 'kg', NULL, 'Nguyên liệu thịt bò',
    220000, 0, 10, 3,
    1, 0, 'active'
),
(
    (SELECT id FROM product_categories WHERE code = 'DO_UONG' LIMIT 1),
    'DU001', 'Coca Cola lon', 'drink', 'lon', NULL, 'Đồ uống bán lẻ',
    8000, 15000, 100, 20,
    1, 1, 'active'
),
(
    (SELECT id FROM product_categories WHERE code = 'MON_CHINH' LIMIT 1),
    'MA001', 'Cơm chiên hải sản', 'dish', 'phần', NULL, 'Món ăn bán cho khách',
    35000, 55000, 0, 0,
    0, 1, 'active'
),
(
    (SELECT id FROM product_categories WHERE code = 'MON_CHINH' LIMIT 1),
    'MA002', 'Bún bò', 'dish', 'tô', NULL, 'Món ăn bán cho khách',
    30000, 50000, 0, 0,
    0, 1, 'active'
),
(
    (SELECT id FROM product_categories WHERE code = 'VAT_TU' LIMIT 1),
    'VT001', 'Hộp xốp', 'supply', 'cái', NULL, 'Vật tư đóng gói',
    1200, 0, 200, 50,
    1, 0, 'active'
);

SET NAMES utf8mb4;

UPDATE roles SET name = 'Quản trị' WHERE code = 'admin';
UPDATE roles SET name = 'Nhân viên' WHERE code = 'staff';
-- GHI CHÚ:
-- 1. Tạo hash bcrypt thật cho admin/staff rồi mới insert users.
-- 2. Admin toàn quyền, staff chỉ thao tác chức năng cơ bản.