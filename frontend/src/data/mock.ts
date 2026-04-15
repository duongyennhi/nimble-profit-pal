import { User, Category, Product, Supplier, Customer, PurchaseReceipt, SalesInvoice, StoreSettings } from '@/types';

export const mockUsers: User[] = [
  { id: '1', username: 'admin', fullName: 'Dương Thị Yến Nhi', role: 'admin', email: 'admin@shop.vn', active: true },
  { id: '2', username: 'staff1', fullName: 'Trần Thị Bình', role: 'staff', email: 'binh@shop.vn', active: true },
  { id: '3', username: 'staff2', fullName: 'Lê Văn Cường', role: 'staff', email: 'cuong@shop.vn', active: true },
];

export const mockCategories: Category[] = [
  { id: '1', name: 'Thực phẩm' },
  { id: '2', name: 'Đồ uống' },
  { id: '3', name: 'Gia dụng' },
  { id: '4', name: 'Văn phòng phẩm' },
  { id: '5', name: 'Mỹ phẩm' },
];

export const mockProducts: Product[] = [
  { id: '1', code: 'SP001', name: 'Gạo ST25 (5kg)', categoryId: '1', unit: 'Bao', barcode: '8901234001', costPrice: 85000, salePrice: 110000, stock: 50, minStock: 10, status: 'active' },
  { id: '2', code: 'SP002', name: 'Nước mắm Phú Quốc', categoryId: '1', unit: 'Chai', barcode: '8901234002', costPrice: 28000, salePrice: 38000, stock: 120, minStock: 20, status: 'active' },
  { id: '3', code: 'SP003', name: 'Coca Cola 330ml', categoryId: '2', unit: 'Lon', barcode: '8901234003', costPrice: 7000, salePrice: 10000, stock: 200, minStock: 50, status: 'active' },
  { id: '4', code: 'SP004', name: 'Trà xanh 0 độ', categoryId: '2', unit: 'Chai', barcode: '8901234004', costPrice: 6000, salePrice: 10000, stock: 150, minStock: 30, status: 'active' },
  { id: '5', code: 'SP005', name: 'Bột giặt OMO 3kg', categoryId: '3', unit: 'Gói', barcode: '8901234005', costPrice: 95000, salePrice: 125000, stock: 8, minStock: 10, status: 'active' },
  { id: '6', code: 'SP006', name: 'Giấy A4 Double A', categoryId: '4', unit: 'Ram', barcode: '8901234006', costPrice: 55000, salePrice: 72000, stock: 30, minStock: 5, status: 'active' },
  { id: '7', code: 'SP007', name: 'Kem chống nắng Anessa', categoryId: '5', unit: 'Tuýp', barcode: '8901234007', costPrice: 350000, salePrice: 450000, stock: 15, minStock: 5, status: 'active' },
  { id: '8', code: 'SP008', name: 'Mì Hảo Hảo (thùng)', categoryId: '1', unit: 'Thùng', barcode: '8901234008', costPrice: 75000, salePrice: 95000, stock: 3, minStock: 10, status: 'active' },
  { id: '9', code: 'SP009', name: 'Nước suối Aquafina 500ml', categoryId: '2', unit: 'Chai', barcode: '8901234009', costPrice: 3000, salePrice: 5000, stock: 300, minStock: 100, status: 'active' },
  { id: '10', code: 'SP010', name: 'Bút bi Thiên Long', categoryId: '4', unit: 'Cây', barcode: '8901234010', costPrice: 3000, salePrice: 5000, stock: 500, minStock: 50, status: 'active' },
];

export const mockSuppliers: Supplier[] = [
  { id: '1', name: 'Công ty TNHH Lương Thực ABC', phone: '028-12345678', address: 'Q.1, TP.HCM' },
  { id: '2', name: 'NCC Đồ Uống Miền Nam', phone: '028-87654321', address: 'Q.7, TP.HCM' },
  { id: '3', name: 'Đại lý Gia Dụng Thành Công', phone: '028-11223344', address: 'Q.Bình Thạnh, TP.HCM' },
];

export const mockCustomers: Customer[] = [
  { id: '1', name: 'Chị Hoa', phone: '0901234567', address: 'Q.3, TP.HCM' },
  { id: '2', name: 'Anh Tùng', phone: '0912345678', address: 'Q.Tân Bình, TP.HCM' },
  { id: '3', name: 'Cô Mai', phone: '0923456789', address: 'Q.Gò Vấp, TP.HCM' },
];

const today = new Date().toISOString().split('T')[0];

export const mockPurchaseReceipts: PurchaseReceipt[] = [
  {
    id: '1', receiptNumber: 'PN-20240101-001', supplierId: '1', supplierName: 'Công ty TNHH Lương Thực ABC',
    lines: [
      { id: '1', productId: '1', productName: 'Gạo ST25 (5kg)', quantity: 100, costPrice: 85000, total: 8500000 },
      { id: '2', productId: '2', productName: 'Nước mắm Phú Quốc', quantity: 50, costPrice: 28000, total: 1400000 },
    ],
    totalAmount: 9900000, createdAt: `${today}T08:00:00`, createdBy: 'admin',
  },
];

export const mockSalesInvoices: SalesInvoice[] = [
  {
    id: '1', invoiceNumber: 'HD-20240101-001', customerId: '1', customerName: 'Chị Hoa',
    lines: [
      { id: '1', productId: '1', productName: 'Gạo ST25 (5kg)', quantity: 2, unitPrice: 110000, discount: 0, total: 220000, costPrice: 85000 },
      { id: '2', productId: '3', productName: 'Coca Cola 330ml', quantity: 6, unitPrice: 10000, discount: 0, total: 60000, costPrice: 7000 },
    ],
    subtotal: 280000, discount: 0, totalAmount: 280000,
    payment: { method: 'cash', amount: 280000, customerPaid: 300000, change: 20000, confirmed: true },
    createdAt: `${today}T09:30:00`, createdBy: 'staff1',
  },
  {
    id: '2', invoiceNumber: 'HD-20240101-002', customerName: 'Khách lẻ',
    lines: [
      { id: '3', productId: '7', productName: 'Kem chống nắng Anessa', quantity: 1, unitPrice: 450000, discount: 0, total: 450000, costPrice: 350000 },
    ],
    subtotal: 450000, discount: 0, totalAmount: 450000,
    payment: { method: 'bank_transfer', amount: 450000, confirmed: true },
    createdAt: `${today}T10:15:00`, createdBy: 'staff1',
  },
  {
    id: '3', invoiceNumber: 'HD-20240101-003', customerId: '2', customerName: 'Anh Tùng',
    lines: [
      { id: '4', productId: '5', productName: 'Bột giặt OMO 3kg', quantity: 2, unitPrice: 125000, discount: 5000, total: 245000, costPrice: 95000 },
      { id: '5', productId: '9', productName: 'Nước suối Aquafina 500ml', quantity: 12, unitPrice: 5000, discount: 0, total: 60000, costPrice: 3000 },
    ],
    subtotal: 310000, discount: 5000, totalAmount: 305000,
    payment: { method: 'pos', amount: 305000, confirmed: true },
    createdAt: `${today}T14:00:00`, createdBy: 'admin',
  },
];

export const mockStoreSettings: StoreSettings = {
  storeName: 'CỬA HÀNG TIỆN LỢI ABC',
  storeAddress: '123 Nguyễn Huệ, Q.1, TP.Hồ Chí Minh',
  storePhone: '028-1234 5678',
  billFooter: 'Cảm ơn quý khách! Hẹn gặp lại!',
};

export const revenueChartData = [
  { name: 'T2', revenue: 4500000, profit: 1200000 },
  { name: 'T3', revenue: 5200000, profit: 1500000 },
  { name: 'T4', revenue: 3800000, profit: 900000 },
  { name: 'T5', revenue: 6100000, profit: 1800000 },
  { name: 'T6', revenue: 7200000, profit: 2100000 },
  { name: 'T7', revenue: 5800000, profit: 1600000 },
  { name: 'CN', revenue: 8500000, profit: 2800000 },
];

export const paymentMethodData = [
  { name: 'Tiền mặt', value: 45, fill: 'hsl(220, 70%, 50%)' },
  { name: 'Chuyển khoản', value: 35, fill: 'hsl(160, 60%, 45%)' },
  { name: 'POS', value: 20, fill: 'hsl(38, 92%, 50%)' },
];

export const topSellingProducts = [
  { name: 'Coca Cola 330ml', quantity: 150, revenue: 1500000 },
  { name: 'Nước suối Aquafina', quantity: 120, revenue: 600000 },
  { name: 'Gạo ST25 (5kg)', quantity: 45, revenue: 4950000 },
  { name: 'Bút bi Thiên Long', quantity: 80, revenue: 400000 },
  { name: 'Mì Hảo Hảo (thùng)', quantity: 35, revenue: 3325000 },
];
