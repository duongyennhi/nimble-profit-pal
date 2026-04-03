import React, { useState } from 'react';
import { mockProducts, mockCustomers } from '@/data/mock';
import { SalesInvoice, SalesInvoiceLine, PaymentMethod, PaymentDetail } from '@/types';
import { formatCurrency, generateId, generateInvoiceNumber } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, CreditCard, Banknote, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const SalesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [lines, setLines] = useState<SalesInvoiceLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customerPaid, setCustomerPaid] = useState(0);

  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const total = subtotal - discount;
  const change = paymentMethod === 'cash' ? Math.max(0, customerPaid - total) : 0;

  const addLine = () => {
    setLines(prev => [...prev, { id: generateId(), productId: '', productName: '', quantity: 1, unitPrice: 0, discount: 0, total: 0, costPrice: 0 }]);
  };

  const updateLine = (id: string, field: string, value: string | number) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      if (field === 'productId') {
        const p = mockProducts.find(pr => pr.id === value);
        if (p) {
          updated.productName = p.name;
          updated.unitPrice = p.salePrice;
          updated.costPrice = p.costPrice;
          updated.total = updated.quantity * p.salePrice - updated.discount;
        }
      }
      if (['quantity', 'unitPrice', 'discount'].includes(field)) {
        const qty = field === 'quantity' ? Number(value) : updated.quantity;
        const price = field === 'unitPrice' ? Number(value) : updated.unitPrice;
        const disc = field === 'discount' ? Number(value) : updated.discount;
        updated.total = qty * price - disc;
      }
      return updated;
    }));
  };

  const removeLine = (id: string) => setLines(prev => prev.filter(l => l.id !== id));

  const handleCreate = () => {
    if (lines.length === 0) { toast.error('Vui lòng thêm sản phẩm'); return; }
    if (paymentMethod === 'cash' && customerPaid < total) { toast.error('Số tiền khách trả không đủ'); return; }

    const payment: PaymentDetail = {
      method: paymentMethod,
      amount: total,
      confirmed: true,
      ...(paymentMethod === 'cash' ? { customerPaid, change } : {}),
    };

    const invoice: SalesInvoice = {
      id: generateId(), invoiceNumber: generateInvoiceNumber(),
      customerId: customerId || undefined,
      customerName: customerId ? mockCustomers.find(c => c.id === customerId)?.name : customerName || 'Khách lẻ',
      lines, subtotal, discount, totalAmount: total, payment,
      createdAt: new Date().toISOString(), createdBy: user?.username || '',
    };

    toast.success(`Tạo hóa đơn ${invoice.invoiceNumber} thành công!`);
    navigate('/invoices', { state: { newInvoice: invoice } });
    setDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setCustomerId(''); setCustomerName(''); setLines([]); setDiscount(0);
    setPaymentMethod('cash'); setCustomerPaid(0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bán hàng</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Tạo hóa đơn</Button>
      </div>

      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <p className="text-lg">Nhấn "Tạo hóa đơn" để bắt đầu bán hàng</p>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Tạo hóa đơn bán hàng</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Customer */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Khách hàng</Label>
                <Select value={customerId} onValueChange={v => { setCustomerId(v); setCustomerName(''); }}>
                  <SelectTrigger><SelectValue placeholder="Chọn hoặc bỏ trống" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Khách lẻ</SelectItem>
                    {mockCustomers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {(!customerId || customerId === 'none') && (
                <div className="space-y-1">
                  <Label>Tên khách (tùy chọn)</Label>
                  <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Tên khách hàng" />
                </div>
              )}
            </div>

            {/* Product lines */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Sản phẩm</Label>
                <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" /> Thêm</Button>
              </div>
              {lines.map(line => (
                <div key={line.id} className="flex gap-2 mb-2 items-end">
                  <div className="flex-1">
                    <Select value={line.productId} onValueChange={v => updateLine(line.id, 'productId', v)}>
                      <SelectTrigger className="text-xs"><SelectValue placeholder="Chọn SP" /></SelectTrigger>
                      <SelectContent>
                        {mockProducts.filter(p => p.status === 'active').map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name} (Kho: {p.stock})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input className="w-16" type="number" min={1} value={line.quantity} onChange={e => updateLine(line.id, 'quantity', Number(e.target.value))} />
                  <Input className="w-24" type="number" value={line.unitPrice} onChange={e => updateLine(line.id, 'unitPrice', Number(e.target.value))} />
                  <Input className="w-20" type="number" placeholder="CK" value={line.discount} onChange={e => updateLine(line.id, 'discount', Number(e.target.value))} />
                  <span className="text-sm w-24 text-right font-medium shrink-0">{formatCurrency(line.total)}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeLine(line.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span>Tạm tính:</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between items-center">
                <span>Chiết khấu:</span>
                <Input className="w-28 text-right" type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
              </div>
              <div className="flex justify-between text-lg font-bold"><span>Tổng cộng:</span><span className="text-primary">{formatCurrency(total)}</span></div>
            </div>

            {/* Payment */}
            <div>
              <Label className="mb-2 block">Phương thức thanh toán</Label>
              <Tabs value={paymentMethod} onValueChange={v => setPaymentMethod(v as PaymentMethod)}>
                <TabsList className="w-full">
                  <TabsTrigger value="cash" className="flex-1"><Banknote className="h-4 w-4 mr-1" /> Tiền mặt</TabsTrigger>
                  <TabsTrigger value="bank_transfer" className="flex-1"><QrCode className="h-4 w-4 mr-1" /> Chuyển khoản</TabsTrigger>
                  <TabsTrigger value="pos" className="flex-1"><CreditCard className="h-4 w-4 mr-1" /> POS</TabsTrigger>
                </TabsList>
                <TabsContent value="cash" className="space-y-2 mt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Khách trả</Label>
                      <Input type="number" value={customerPaid} onChange={e => setCustomerPaid(Number(e.target.value))} />
                    </div>
                    <div>
                      <Label>Tiền thừa</Label>
                      <div className="h-10 flex items-center text-lg font-bold text-success">{formatCurrency(change)}</div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="bank_transfer" className="mt-3">
                  <Card className="bg-muted">
                    <CardContent className="p-4 text-center">
                      <QrCode className="h-20 w-20 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Hiển thị mã QR chuyển khoản tại đây</p>
                      <p className="font-bold mt-2">{formatCurrency(total)}</p>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="pos" className="mt-3">
                  <Card className="bg-muted">
                    <CardContent className="p-4 text-center">
                      <CreditCard className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Xác nhận thanh toán qua máy POS</p>
                      <p className="font-bold mt-2">{formatCurrency(total)}</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            <Button className="w-full" size="lg" onClick={handleCreate}>Thanh toán & Tạo hóa đơn</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesPage;
