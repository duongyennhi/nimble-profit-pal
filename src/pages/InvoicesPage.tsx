import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { mockSalesInvoices, mockStoreSettings } from '@/data/mock';
import { SalesInvoice } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer, Eye } from 'lucide-react';

const paymentLabel = (m: string) => m === 'cash' ? 'Tiền mặt' : m === 'bank_transfer' ? 'Chuyển khoản' : 'POS';

const InvoicesPage: React.FC = () => {
  const location = useLocation();
  const newInvoice = (location.state as any)?.newInvoice as SalesInvoice | undefined;
  const [invoices] = useState<SalesInvoice[]>(() => {
    const base = [...mockSalesInvoices];
    if (newInvoice) base.unshift(newInvoice);
    return base;
  });
  const [viewInvoice, setViewInvoice] = useState<SalesInvoice | null>(null);

  const printBill = (inv: SalesInvoice) => {
    setViewInvoice(null);
    setTimeout(() => {
      const w = window.open('', '_blank');
      if (!w) return;
      const s = mockStoreSettings;
      w.document.write(`
        <html><head><title>Hóa đơn ${inv.invoiceNumber}</title>
        <style>
          body { font-family: monospace; width: 300px; margin: 0 auto; padding: 10px; font-size: 12px; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 2px 0; }
          .right { text-align: right; }
        </style></head><body>
        <div class="center bold">${s.storeName}</div>
        <div class="center">${s.storeAddress}</div>
        <div class="center">ĐT: ${s.storePhone}</div>
        <div class="line"></div>
        <div class="center bold">HÓA ĐƠN BÁN HÀNG</div>
        <div>Số: ${inv.invoiceNumber}</div>
        <div>Ngày: ${new Date(inv.createdAt).toLocaleString('vi-VN')}</div>
        <div>Khách: ${inv.customerName || 'Khách lẻ'}</div>
        <div>Thu ngân: ${inv.createdBy}</div>
        <div class="line"></div>
        <table>
          ${inv.lines.map((l, i) => `
            <tr><td colspan="2">${i + 1}. ${l.productName}</td></tr>
            <tr><td>&nbsp;&nbsp;${l.quantity} x ${new Intl.NumberFormat('vi-VN').format(l.unitPrice)}</td><td class="right">${new Intl.NumberFormat('vi-VN').format(l.total)}</td></tr>
          `).join('')}
        </table>
        <div class="line"></div>
        <table>
          <tr><td>Tạm tính:</td><td class="right">${new Intl.NumberFormat('vi-VN').format(inv.subtotal)}</td></tr>
          ${inv.discount > 0 ? `<tr><td>Chiết khấu:</td><td class="right">-${new Intl.NumberFormat('vi-VN').format(inv.discount)}</td></tr>` : ''}
          <tr class="bold"><td>TỔNG CỘNG:</td><td class="right">${new Intl.NumberFormat('vi-VN').format(inv.totalAmount)}</td></tr>
          <tr><td>Thanh toán:</td><td class="right">${paymentLabel(inv.payment.method)}</td></tr>
          ${inv.payment.customerPaid ? `<tr><td>Khách trả:</td><td class="right">${new Intl.NumberFormat('vi-VN').format(inv.payment.customerPaid)}</td></tr>` : ''}
          ${inv.payment.change ? `<tr><td>Tiền thừa:</td><td class="right">${new Intl.NumberFormat('vi-VN').format(inv.payment.change)}</td></tr>` : ''}
        </table>
        <div class="line"></div>
        <div class="center">${s.billFooter}</div>
        </body></html>
      `);
      w.document.close();
      w.print();
    }, 100);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Danh sách hóa đơn</h1>
      <Card>
        <CardContent className="p-4">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Số hóa đơn</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead className="text-right">Tổng tiền</TableHead>
                  <TableHead>Thanh toán</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                    <TableCell>{inv.customerName || 'Khách lẻ'}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(inv.totalAmount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{paymentLabel(inv.payment.method)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDateTime(inv.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewInvoice(inv)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => printBill(inv)}><Printer className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Chi tiết hóa đơn {viewInvoice?.invoiceNumber}</DialogTitle></DialogHeader>
          {viewInvoice && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Khách:</span> {viewInvoice.customerName}</div>
                <div><span className="text-muted-foreground">Ngày:</span> {formatDateTime(viewInvoice.createdAt)}</div>
                <div><span className="text-muted-foreground">Thu ngân:</span> {viewInvoice.createdBy}</div>
                <div><span className="text-muted-foreground">Thanh toán:</span> {paymentLabel(viewInvoice.payment.method)}</div>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead className="text-right">SL</TableHead>
                      <TableHead className="text-right">Đơn giá</TableHead>
                      <TableHead className="text-right">Thành tiền</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewInvoice.lines.map(l => (
                      <TableRow key={l.id}>
                        <TableCell>{l.productName}</TableCell>
                        <TableCell className="text-right">{l.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(l.unitPrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(l.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-1 text-right">
                <div>Tạm tính: {formatCurrency(viewInvoice.subtotal)}</div>
                {viewInvoice.discount > 0 && <div>Chiết khấu: -{formatCurrency(viewInvoice.discount)}</div>}
                <div className="text-lg font-bold">Tổng: {formatCurrency(viewInvoice.totalAmount)}</div>
              </div>
              {viewInvoice.payment.method === 'cash' && viewInvoice.payment.customerPaid && (
                <div className="text-right text-muted-foreground">
                  Khách trả: {formatCurrency(viewInvoice.payment.customerPaid)} | Thừa: {formatCurrency(viewInvoice.payment.change || 0)}
                </div>
              )}
              <Button className="w-full" onClick={() => printBill(viewInvoice)}><Printer className="h-4 w-4 mr-1" /> In hóa đơn</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoicesPage;
