export type UserRole = 'admin' | 'staff';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  email: string;
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  unit: string;
  barcode: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  status: 'active' | 'inactive';
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export interface PurchaseReceiptLine {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  total: number;
}

export interface PurchaseReceipt {
  id: string;
  receiptNumber: string;
  supplierId: string;
  supplierName: string;
  lines: PurchaseReceiptLine[];
  totalAmount: number;
  createdAt: string;
  createdBy: string;
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'pos';

export interface PaymentDetail {
  method: PaymentMethod;
  amount: number;
  customerPaid?: number;
  change?: number;
  confirmed: boolean;
}

export interface SalesInvoiceLine {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  costPrice: number;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  lines: SalesInvoiceLine[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  payment: PaymentDetail;
  createdAt: string;
  createdBy: string;
}

export interface StoreSettings {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  billFooter: string;
}

export interface DashboardSummary {
  todayRevenue: number;
  monthRevenue: number;
  todayProfit: number;
  todayInvoices: number;
  lowStockProducts: Product[];
}
