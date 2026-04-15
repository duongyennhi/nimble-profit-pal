import React, { useEffect, useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Eye,
  Printer,
  QrCode,
  Pencil,
  Trash2,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getSalesInvoicesApi,
  getSalesInvoiceDetailApi,
  updateSalesInvoiceApi,
  confirmSalesInvoicePaymentApi,
} from '@/services/salesService';
import { getProductsApi } from '@/services/productService';

type PaymentMethodUi = 'cash' | 'bank_transfer' | 'pos';

type SalesInvoiceApi = {
  id: number;
  invoice_no: string;
  invoice_date: string;
  created_at?: string | null;
  customer_name?: string | null;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  change_amount: number;
  note?: string | null;
  status: string;
  payment_status?: string | null;
  created_by?: string | null;
  created_by_id?: number;
  payment_method_code?: string | null;
  payment_method_name?: string | null;
};

type SalesInvoiceDetail = SalesInvoiceApi & {
  lines: Array<{
    product_id: number;
    product_name: string;
    unit: string;
    quantity: number;
    unit_price: number;
    unit_cost?: number;
    line_discount?: number;
    line_total: number;
    profit_amount?: number;
  }>;
};

type ProductApi = {
  id: number;
  code: string;
  name: string;
  unit: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  status: 'active' | 'inactive';
  product_type?: 'ingredient' | 'dish' | 'drink' | 'supply';
  can_sell?: boolean | number;
};

type EditLine = {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  line_total: number;
  unit: string;
  product_type: 'ingredient' | 'dish' | 'drink' | 'supply';
  stock_quantity: number;
};

const STORE_INFO = {
  name: 'QUÁN ĂN GIA ĐÌNH',
  address: 'Địa chỉ quán của bạn',
  phone: 'SĐT: 09xxxxxxxx',
  bankName: 'MB Bank',
  accountNo: '123456789',
  accountName: 'NGUYEN VAN A',
  qrImageUrl: '',
};

const makeLineId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';

  const date = new Date(value);

  const time = date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const day = date.toLocaleDateString('vi-VN');

  return `${time} ${day}`;
};

const mapPaymentCodeToUi = (code?: string | null): PaymentMethodUi => {
  switch (code) {
    case 'bank_qr':
      return 'bank_transfer';
    case 'pos':
      return 'pos';
    default:
      return 'cash';
  }
};

const paymentLabel = (invoice: {
  payment_method_code?: string | null;
  payment_method_name?: string | null;
}) => {
  switch (invoice.payment_method_code) {
    case 'cash':
      return 'Tiền mặt';
    case 'bank_qr':
      return 'Chuyển khoản';
    case 'pos':
      return 'POS';
    default:
      return invoice.payment_method_name || 'Thanh toán';
  }
};

const paymentStatusLabel = (status?: string | null) => {
  switch (status) {
    case 'paid':
      return 'Đã thanh toán';
    case 'pending':
      return 'Chờ xác nhận';
    default:
      return 'Không rõ';
  }
};

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<SalesInvoiceApi[]>([]);
  const [products, setProducts] = useState<ProductApi[]>([]);
  const [loading, setLoading] = useState(true);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoiceDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editDiscount, setEditDiscount] = useState(0);
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethodUi>('cash');
  const [editCustomerPaid, setEditCustomerPaid] = useState(0);
  const [editLines, setEditLines] = useState<EditLine[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<number | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await getSalesInvoicesApi();
      setInvoices(data.invoices || []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lỗi tải danh sách hóa đơn';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await getProductsApi();
      setProducts(data.products || []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lỗi tải sản phẩm';
      toast.error(message);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchProducts();
  }, []);

  const sellableProducts = useMemo(() => {
    return products.filter((product) => {
      const canSell = product.can_sell === true || Number(product.can_sell) === 1;
      return product.status === 'active' && canSell;
    });
  }, [products]);

  const editSubtotal = editLines.reduce(
    (sum, line) => sum + Number(line.line_total || 0),
    0
  );

  const editTotal = Math.max(0, editSubtotal - Number(editDiscount || 0));
  const editChange =
    editPaymentMethod === 'cash'
      ? Math.max(0, Number(editCustomerPaid || 0) - editTotal)
      : 0;

  const handleViewInvoice = async (id: number) => {
    try {
      setLoadingDetail(true);
      const data = await getSalesInvoiceDetailApi(id);
      setSelectedInvoice(data.invoice || null);
      setDetailOpen(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lỗi lấy chi tiết hóa đơn';
      toast.error(message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleConfirmPayment = async (id: number) => {
    try {
      setConfirmingPaymentId(id);
      await confirmSalesInvoicePaymentApi(id);
      toast.success('Xác nhận thanh toán thành công');
      await fetchInvoices();

      if (selectedInvoice && selectedInvoice.id === id) {
        const data = await getSalesInvoiceDetailApi(id);
        setSelectedInvoice(data.invoice || null);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lỗi xác nhận thanh toán';
      toast.error(message);
    } finally {
      setConfirmingPaymentId(null);
    }
  };

  const openEditInvoice = async (id: number) => {
    try {
      const data = await getSalesInvoiceDetailApi(id);
      const invoice = data.invoice as SalesInvoiceDetail;

      setEditingInvoiceId(invoice.id);
      setEditCustomerName(invoice.customer_name || '');
      setEditNote(invoice.note || '');
      setEditDiscount(Number(invoice.discount_amount || 0));
      setEditPaymentMethod(mapPaymentCodeToUi(invoice.payment_method_code));
      setEditCustomerPaid(Number(invoice.amount_paid || 0));

      const mappedLines: EditLine[] = (invoice.lines || []).map((line) => {
        const matchedProduct = sellableProducts.find(
          (p) => Number(p.id) === Number(line.product_id)
        );

        return {
          id: makeLineId(),
          product_id: String(line.product_id),
          product_name: line.product_name,
          quantity: Number(line.quantity),
          unit_price: Number(line.unit_price),
          discount_amount: Number(line.line_discount || 0),
          line_total: Number(line.line_total || 0),
          unit: line.unit || matchedProduct?.unit || '',
          product_type:
            (matchedProduct?.product_type as EditLine['product_type']) || 'dish',
          stock_quantity: Number(matchedProduct?.stock_quantity || 0),
        };
      });

      setEditLines(mappedLines);
      setEditOpen(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lỗi mở form sửa hóa đơn';
      toast.error(message);
    }
  };

  const addEditLine = () => {
    setEditLines((prev) => [
      ...prev,
      {
        id: makeLineId(),
        product_id: '',
        product_name: '',
        quantity: 1,
        unit_price: 0,
        discount_amount: 0,
        line_total: 0,
        unit: '',
        product_type: 'dish',
        stock_quantity: 0,
      },
    ]);
  };

  const removeEditLine = (id: string) => {
    setEditLines((prev) => prev.filter((line) => line.id !== id));
  };

  const updateEditLine = (
    id: string,
    field: 'product_id' | 'quantity' | 'discount_amount',
    value: string | number
  ) => {
    setEditLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;

        const updated = { ...line };

        if (field === 'product_id') {
          updated.product_id = String(value);

          const product = sellableProducts.find(
            (p) => String(p.id) === String(value)
          );

          if (product) {
            updated.product_name = product.name;
            updated.unit_price = Number(product.sale_price || 0);
            updated.unit = product.unit || '';
            updated.product_type =
              (product.product_type as EditLine['product_type']) || 'dish';
            updated.stock_quantity = Number(product.stock_quantity || 0);
          } else {
            updated.product_name = '';
            updated.unit_price = 0;
            updated.unit = '';
            updated.product_type = 'dish';
            updated.stock_quantity = 0;
          }
        }

        if (field === 'quantity') {
          updated.quantity = Number(value);
        }

        if (field === 'discount_amount') {
          updated.discount_amount = Number(value);
        }

        updated.line_total =
          Number(updated.quantity) * Number(updated.unit_price) -
          Number(updated.discount_amount || 0);

        return updated;
      })
    );
  };

  const validateEditInvoice = () => {
    if (!editingInvoiceId) {
      toast.error('Không xác định được hóa đơn cần sửa');
      return false;
    }

    if (editLines.length === 0) {
      toast.error('Hóa đơn phải có ít nhất một sản phẩm');
      return false;
    }

    const invalidLine = editLines.find(
      (line) =>
        !line.product_id ||
        Number(line.quantity) <= 0 ||
        Number(line.unit_price) < 0 ||
        Number(line.discount_amount) < 0
    );

    if (invalidLine) {
      toast.error('Vui lòng kiểm tra lại sản phẩm, số lượng hoặc giảm giá');
      return false;
    }

    const overStockLine = editLines.find((line) => {
      if (line.product_type === 'drink' || line.product_type === 'supply') {
        return Number(line.quantity) > Number(line.stock_quantity || 0);
      }
      return false;
    });

    if (overStockLine) {
      toast.error(`Sản phẩm "${overStockLine.product_name}" không đủ tồn kho`);
      return false;
    }

    if (editPaymentMethod === 'cash' && Number(editCustomerPaid || 0) < editTotal) {
      toast.error('Số tiền khách trả không đủ');
      return false;
    }

    return true;
  };

  const handleSaveEditInvoice = async () => {
    if (!validateEditInvoice()) return;

    try {
      setSavingEdit(true);

      await updateSalesInvoiceApi(editingInvoiceId as number, {
        customer_name: editCustomerName?.trim() || 'Khách lẻ',
        note: editNote?.trim() || '',
        discount_amount: Number(editDiscount || 0),
        payment_method: editPaymentMethod,
        customer_paid: editPaymentMethod === 'cash' ? Number(editCustomerPaid || 0) : editTotal,
        change_amount: editPaymentMethod === 'cash' ? editChange : 0,
        lines: editLines.map((line) => ({
          product_id: Number(line.product_id),
          quantity: Number(line.quantity),
          unit_price: Number(line.unit_price),
          discount_amount: Number(line.discount_amount || 0),
        })),
      });

      toast.success('Cập nhật hóa đơn thành công');
      setEditOpen(false);
      setEditingInvoiceId(null);
      fetchInvoices();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lỗi cập nhật hóa đơn';
      toast.error(message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handlePrintInvoice = async (id: number) => {
    try {
      const data = await getSalesInvoiceDetailApi(id);
      const invoice = data.invoice as SalesInvoiceDetail;

      const printWindow = window.open('', '_blank', 'width=420,height=900');
      if (!printWindow) {
        toast.error('Không mở được cửa sổ in');
        return;
      }

      const itemsHtml = (invoice.lines || [])
        .map(
          (line) => `
            <tr>
              <td class="item-name">${escapeHtml(line.product_name)}</td>
              <td class="item-qty">${line.quantity}</td>
              <td class="item-price">${formatCurrency(Number(line.unit_price || 0))}</td>
              <td class="item-total">${formatCurrency(Number(line.line_total || 0))}</td>
            </tr>
          `
        )
        .join('');

      const paymentCode = invoice.payment_method_code || '';
      const qrBlock =
        paymentCode === 'bank_qr'
          ? `
            <div class="pay-block">
              <div class="pay-title">THANH TOÁN CHUYỂN KHOẢN</div>
              ${
                STORE_INFO.qrImageUrl
                  ? `<img src="${STORE_INFO.qrImageUrl}" alt="QR chuyển khoản" class="qr-img" />`
                  : `<div class="qr-placeholder">MÃ QR CHUYỂN KHOẢN</div>`
              }
              <div class="bank-line"><strong>Ngân hàng:</strong> ${STORE_INFO.bankName}</div>
              <div class="bank-line"><strong>Số TK:</strong> ${STORE_INFO.accountNo}</div>
              <div class="bank-line"><strong>Chủ TK:</strong> ${STORE_INFO.accountName}</div>
              <div class="bank-line"><strong>Số tiền:</strong> ${formatCurrency(Number(invoice.total_amount || 0))}</div>
              <div class="bank-line"><strong>Trạng thái:</strong> ${paymentStatusLabel(invoice.payment_status)}</div>
            </div>
          `
          : paymentCode === 'pos'
          ? `
            <div class="pay-block">
              <div class="pay-title">THANH TOÁN POS</div>
              <div class="bank-line">Đã thanh toán qua máy POS</div>
              <div class="bank-line"><strong>Số tiền:</strong> ${formatCurrency(Number(invoice.total_amount || 0))}</div>
            </div>
          `
          : `
            <div class="pay-block">
              <div class="pay-title">THANH TOÁN TIỀN MẶT</div>
              <div class="bank-line"><strong>Khách trả:</strong> ${formatCurrency(Number(invoice.amount_paid || 0))}</div>
              <div class="bank-line"><strong>Tiền thừa:</strong> ${formatCurrency(Number(invoice.change_amount || 0))}</div>
            </div>
          `;

      printWindow.document.write(`
        <html>
          <head>
            <title>${invoice.invoice_no}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                width: 80mm;
                margin: 0 auto;
                padding: 8px;
                color: #000;
                font-size: 12px;
              }
              .center { text-align: center; }
              .store-name {
                font-size: 26px;
                font-weight: 700;
                text-transform: uppercase;
                margin-bottom: 4px;
              }
              .store-sub {
                font-size: 12px;
                margin-bottom: 2px;
              }
              .title {
                text-align: center;
                font-size: 18px;
                font-weight: 700;
                margin: 10px 0 8px;
                text-transform: uppercase;
              }
              .info-row {
                display: flex;
                justify-content: space-between;
                gap: 8px;
                margin: 2px 0;
              }
              .separator {
                border-top: 1px dashed #000;
                margin: 8px 0;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
              }
              th {
                text-align: left;
                padding: 4px 0;
                border-bottom: 1px dashed #000;
              }
              td {
                padding: 4px 0;
                vertical-align: top;
              }
              .item-name { width: 46%; }
              .item-qty { width: 12%; text-align: center; }
              .item-price { width: 20%; text-align: right; }
              .item-total { width: 22%; text-align: right; }
              .sum-row {
                display: flex;
                justify-content: space-between;
                margin: 4px 0;
              }
              .sum-total {
                font-size: 22px;
                font-weight: 700;
                margin-top: 6px;
              }
              .pay-block {
                margin-top: 10px;
                text-align: center;
              }
              .pay-title {
                font-weight: 700;
                margin-bottom: 6px;
              }
              .qr-img {
                width: 180px;
                height: 180px;
                object-fit: contain;
                margin: 8px auto;
                display: block;
              }
              .qr-placeholder {
                width: 180px;
                height: 180px;
                border: 1px dashed #000;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 8px auto;
                font-weight: 700;
              }
              .bank-line {
                margin: 2px 0;
              }
              .footer {
                text-align: center;
                margin-top: 12px;
                font-style: italic;
                font-size: 13px;
              }
            </style>
          </head>
          <body>
            <div class="center">
              <div class="store-name">${escapeHtml(STORE_INFO.name)}</div>
              <div class="store-sub">${escapeHtml(STORE_INFO.address)}</div>
              <div class="store-sub">${escapeHtml(STORE_INFO.phone)}</div>
            </div>

            <div class="title">PHIẾU THANH TOÁN</div>

            <div class="info-row"><span>Số HĐ:</span><strong>${invoice.invoice_no}</strong></div>
            <div class="info-row"><span>Khách:</span><strong>${escapeHtml(invoice.customer_name || 'Khách lẻ')}</strong></div>
            <div class="info-row"><span>Giờ tạo:</span><span>${formatDateTime(invoice.created_at || invoice.invoice_date)}</span></div>
            <div class="info-row"><span>Thu ngân:</span><span>${escapeHtml(invoice.created_by || '-')}</span></div>
            <div class="info-row"><span>Thanh toán:</span><span>${escapeHtml(paymentLabel(invoice))}</span></div>
            <div class="info-row"><span>Trạng thái TT:</span><span>${escapeHtml(paymentStatusLabel(invoice.payment_status))}</span></div>
            <div class="info-row"><span>Ghi chú:</span><span>${escapeHtml(invoice.note || '-')}</span></div>

            <div class="separator"></div>

            <table>
              <thead>
                <tr>
                  <th>Tên món</th>
                  <th class="item-qty">SL</th>
                  <th class="item-price">ĐG</th>
                  <th class="item-total">T.Tiền</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div class="separator"></div>

            <div class="sum-row"><span>Tạm tính</span><span>${formatCurrency(Number(invoice.subtotal || 0))}</span></div>
            <div class="sum-row"><span>Chiết khấu</span><span>${formatCurrency(Number(invoice.discount_amount || 0))}</span></div>
            <div class="sum-row sum-total"><span>Tổng cộng</span><span>${formatCurrency(Number(invoice.total_amount || 0))}</span></div>

            ${qrBlock}

            <div class="footer">Chúc quý khách vui vẻ, hẹn gặp lại!</div>
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lỗi in hóa đơn';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Danh sách hóa đơn</h1>

      <Card>
        <CardContent className="p-4">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Số hóa đơn</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead className="text-right">Tổng tiền</TableHead>
                  <TableHead>Thanh toán</TableHead>
                  <TableHead>Trạng thái thanh toán</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Đang tải dữ liệu...
                    </TableCell>
                  </TableRow>
                ) : invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Chưa có hóa đơn nào
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono text-xs">
                        {invoice.invoice_no}
                      </TableCell>
                      <TableCell>{invoice.customer_name || 'Khách lẻ'}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(invoice.total_amount || 0))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{paymentLabel(invoice)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={invoice.payment_status === 'paid' ? 'default' : 'secondary'}>
                          {paymentStatusLabel(invoice.payment_status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDateTime(invoice.created_at || invoice.invoice_date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewInvoice(invoice.id)}
                            disabled={loadingDetail}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditInvoice(invoice.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePrintInvoice(invoice.id)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>

                          {invoice.payment_method_code === 'bank_qr' &&
                            invoice.payment_status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleConfirmPayment(invoice.id)}
                                disabled={confirmingPaymentId === invoice.id}
                              >
                                <CheckCircle2 className="mr-1 h-4 w-4" />
                                {confirmingPaymentId === invoice.id
                                  ? 'Đang xác nhận...'
                                  : 'Xác nhận thanh toán'}
                              </Button>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết hóa đơn</DialogTitle>
          </DialogHeader>

          {!selectedInvoice ? (
            <div className="text-sm text-muted-foreground">Không có dữ liệu hóa đơn</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="text-center">
                  <h2 className="text-2xl font-bold uppercase">{STORE_INFO.name}</h2>
                  <p className="text-sm text-muted-foreground">{STORE_INFO.address}</p>
                  <p className="text-sm text-muted-foreground">{STORE_INFO.phone}</p>
                  <p className="mt-2 text-lg font-semibold uppercase">Phiếu thanh toán</p>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Số hóa đơn</p>
                    <p className="font-medium">{selectedInvoice.invoice_no}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Khách hàng</p>
                    <p className="font-medium">{selectedInvoice.customer_name || 'Khách lẻ'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Thời gian tạo</p>
                    <p className="font-medium">
                      {formatDateTime(selectedInvoice.created_at || selectedInvoice.invoice_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Thu ngân</p>
                    <p className="font-medium">{selectedInvoice.created_by || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Thanh toán</p>
                    <p className="font-medium">{paymentLabel(selectedInvoice)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Trạng thái thanh toán</p>
                    <p className="font-medium">{paymentStatusLabel(selectedInvoice.payment_status)}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">Ghi chú</p>
                    <p className="font-medium">{selectedInvoice.note || '-'}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên món</TableHead>
                        <TableHead>SL</TableHead>
                        <TableHead className="text-right">ĐG</TableHead>
                        <TableHead className="text-right">Giảm</TableHead>
                        <TableHead className="text-right">T.Tiền</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedInvoice.lines || []).map((line, index) => (
                        <TableRow key={`${line.product_id}-${index}`}>
                          <TableCell>{line.product_name}</TableCell>
                          <TableCell>
                            {line.quantity} {line.unit || ''}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(Number(line.unit_price || 0))}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(Number(line.line_discount || 0))}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(Number(line.line_total || 0))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4 space-y-2 border-t pt-3 text-sm">
                  <div className="flex justify-between">
                    <span>Tạm tính:</span>
                    <span>{formatCurrency(Number(selectedInvoice.subtotal || 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Chiết khấu:</span>
                    <span>{formatCurrency(Number(selectedInvoice.discount_amount || 0))}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold">
                    <span>Tổng cộng:</span>
                    <span>{formatCurrency(Number(selectedInvoice.total_amount || 0))}</span>
                  </div>

                  {selectedInvoice.payment_method_code === 'cash' && (
                    <>
                      <div className="flex justify-between">
                        <span>Khách trả:</span>
                        <span>{formatCurrency(Number(selectedInvoice.amount_paid || 0))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tiền thừa:</span>
                        <span>{formatCurrency(Number(selectedInvoice.change_amount || 0))}</span>
                      </div>
                    </>
                  )}

                  {selectedInvoice.payment_method_code === 'bank_qr' && (
                    <div className="rounded-md border bg-muted p-4 text-center">
                      <QrCode className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
                      <p className="font-semibold">Thanh toán chuyển khoản</p>
                      {STORE_INFO.qrImageUrl ? (
                        <img
                          src={STORE_INFO.qrImageUrl}
                          alt="QR chuyển khoản"
                          className="mx-auto mt-3 h-40 w-40 object-contain"
                        />
                      ) : (
                        <div className="mx-auto mt-3 flex h-40 w-40 items-center justify-center border border-dashed text-sm">
                          Mã QR chuyển khoản
                        </div>
                      )}
                      <p className="mt-2">{STORE_INFO.bankName}</p>
                      <p>{STORE_INFO.accountNo}</p>
                      <p>{STORE_INFO.accountName}</p>
                      <p className="mt-2">
                        Trạng thái: <strong>{paymentStatusLabel(selectedInvoice.payment_status)}</strong>
                      </p>
                    </div>
                  )}

                  {selectedInvoice.payment_method_code === 'pos' && (
                    <div className="rounded-md border bg-muted p-4 text-center">
                      <p className="font-semibold">Thanh toán qua máy POS</p>
                      <p className="text-sm text-muted-foreground">
                        Giao dịch đã thanh toán bằng máy POS
                      </p>
                    </div>
                  )}
                </div>

                <p className="mt-6 text-center italic text-muted-foreground">
                  Chúc quý khách vui vẻ, hẹn gặp lại!
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => handlePrintInvoice(selectedInvoice.id)}>
                  <Printer className="mr-2 h-4 w-4" />
                  In hóa đơn
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setDetailOpen(false);
                    openEditInvoice(selectedInvoice.id);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Sửa hóa đơn
                </Button>

                {selectedInvoice.payment_method_code === 'bank_qr' &&
                  selectedInvoice.payment_status === 'pending' && (
                    <Button
                      variant="outline"
                      onClick={() => handleConfirmPayment(selectedInvoice.id)}
                      disabled={confirmingPaymentId === selectedInvoice.id}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {confirmingPaymentId === selectedInvoice.id
                        ? 'Đang xác nhận...'
                        : 'Xác nhận thanh toán'}
                    </Button>
                  )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditingInvoiceId(null);
            setEditLines([]);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sửa hóa đơn</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Tên khách hàng</Label>
                <Input
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  placeholder="Khách lẻ"
                />
              </div>

              <div className="space-y-1">
                <Label>Ghi chú</Label>
                <Input
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Ví dụ: bàn 3, mang về..."
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Danh sách sản phẩm</Label>
                <Button variant="outline" size="sm" onClick={addEditLine}>
                  <Plus className="mr-1 h-3 w-3" />
                  Thêm dòng
                </Button>
              </div>

              {editLines.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Chưa có sản phẩm nào trong hóa đơn
                </div>
              ) : (
                <div className="space-y-3">
                  {editLines.map((line) => (
                    <div
                      key={line.id}
                      className="grid grid-cols-1 gap-2 rounded-md border p-3 lg:grid-cols-[2fr_110px_120px_100px_140px_40px]"
                    >
                      <div>
                        <Label className="mb-1 block text-xs">Sản phẩm</Label>
                        <Select
                          value={line.product_id}
                          onValueChange={(value) =>
                            updateEditLine(line.id, 'product_id', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn sản phẩm bán" />
                          </SelectTrigger>
                          <SelectContent>
                            {sellableProducts.map((product) => (
                              <SelectItem key={product.id} value={String(product.id)}>
                                {product.name}
                                {product.unit ? ` (${product.unit})` : ''} - Giá: {formatCurrency(Number(product.sale_price || 0))}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="mb-1 block text-xs">
                          Số lượng{line.unit ? ` (${line.unit})` : ''}
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) =>
                            updateEditLine(line.id, 'quantity', Number(e.target.value))
                          }
                        />
                      </div>

                      <div>
                        <Label className="mb-1 block text-xs">Đơn giá bán</Label>
                        <Input
                          type="number"
                          value={line.unit_price}
                          readOnly
                          className="bg-muted"
                        />
                      </div>

                      <div>
                        <Label className="mb-1 block text-xs">Giảm</Label>
                        <Input
                          type="number"
                          min={0}
                          value={line.discount_amount}
                          onChange={(e) =>
                            updateEditLine(
                              line.id,
                              'discount_amount',
                              Number(e.target.value)
                            )
                          }
                        />
                      </div>

                      <div>
                        <Label className="mb-1 block text-xs">Thành tiền</Label>
                        <div className="rounded-md border bg-muted px-3 py-2 text-right text-sm font-medium">
                          {formatCurrency(Number(line.line_total || 0))}
                        </div>
                        <div className="mt-1 text-xs text-right text-muted-foreground">
                          Tồn kho: {line.stock_quantity} {line.unit}
                        </div>
                      </div>

                      <div className="flex items-end justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeEditLine(line.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Tạm tính:</span>
                <span>{formatCurrency(editSubtotal)}</span>
              </div>

              <div className="flex justify-between items-center gap-3">
                <span>Chiết khấu hóa đơn:</span>
                <Input
                  className="w-32 text-right"
                  type="number"
                  min={0}
                  value={editDiscount}
                  onChange={(e) => setEditDiscount(Number(e.target.value))}
                />
              </div>

              <div className="flex justify-between text-lg font-bold">
                <span>Tổng cộng:</span>
                <span>{formatCurrency(editTotal)}</span>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Phương thức thanh toán</Label>
              <Select
                value={editPaymentMethod}
                onValueChange={(value) =>
                  setEditPaymentMethod(value as PaymentMethodUi)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn phương thức thanh toán" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Tiền mặt</SelectItem>
                  <SelectItem value="bank_transfer">Chuyển khoản</SelectItem>
                  <SelectItem value="pos">POS</SelectItem>
                </SelectContent>
              </Select>

              {editPaymentMethod === 'cash' && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <Label>Khách trả</Label>
                    <Input
                      type="number"
                      min={0}
                      value={editCustomerPaid}
                      onChange={(e) => setEditCustomerPaid(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Tiền thừa</Label>
                    <div className="h-10 flex items-center text-lg font-bold text-green-600">
                      {formatCurrency(editChange)}
                    </div>
                  </div>
                </div>
              )}

              {editPaymentMethod === 'bank_transfer' && (
                <div className="mt-3 rounded-md border bg-muted p-4 text-center">
                  <QrCode className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
                  <p className="font-semibold">Thanh toán chuyển khoản</p>
                  {STORE_INFO.qrImageUrl ? (
                    <img
                      src={STORE_INFO.qrImageUrl}
                      alt="QR chuyển khoản"
                      className="mx-auto mt-3 h-40 w-40 object-contain"
                    />
                  ) : (
                    <div className="mx-auto mt-3 flex h-40 w-40 items-center justify-center border border-dashed text-sm">
                      Mã QR chuyển khoản
                    </div>
                  )}
                  <p className="mt-2">{STORE_INFO.bankName}</p>
                  <p>{STORE_INFO.accountNo}</p>
                  <p>{STORE_INFO.accountName}</p>
                  <p className="mt-2 font-semibold">{formatCurrency(editTotal)}</p>
                </div>
              )}

              {editPaymentMethod === 'pos' && (
                <div className="mt-3 rounded-md border bg-muted p-4 text-center">
                  <p className="font-semibold">Thanh toán qua máy POS</p>
                  <p className="text-sm text-muted-foreground">
                    Xác nhận giao dịch đã thanh toán bằng máy POS
                  </p>
                </div>
              )}
            </div>

            <Button
              className="w-full"
              onClick={handleSaveEditInvoice}
              disabled={savingEdit}
            >
              {savingEdit ? 'Đang lưu...' : 'Lưu cập nhật hóa đơn'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoicesPage;