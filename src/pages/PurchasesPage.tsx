import React, { useState } from 'react';
import { mockProducts, mockSuppliers, mockPurchaseReceipts } from '@/data/mock';
import { PurchaseReceipt, PurchaseReceiptLine, Product } from '@/types';
import { formatCurrency, generateId, generateReceiptNumber } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const PurchasesPage: React.FC = () => {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>(mockPurchaseReceipts);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines] = useState<PurchaseReceiptLine[]>([]);

  const addLine = () => {
    setLines(prev => [...prev, { id: generateId(), productId: '', productName: '', quantity: 1, costPrice: 0, total: 0 }]);
  };

  const updateLine = (id: string, field: string, value: string | number) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      if (field === 'productId') {
        const p = mockProducts.find(pr => pr.id === value);
        if (p) { updated.productName = p.name; updated.costPrice = p.costPrice; updated.total = updated.quantity * p.costPrice; }
      }
      if (field === 'quantity' || field === 'costPrice') {
        updated.total = (field === 'quantity' ? Number(value) : updated.quantity) * (field === 'costPrice' ? Number(value) : updated.costPrice);
      }
      return updated;
    }));
  };

  const removeLine = (id: string) => setLines(prev => prev.filter(l => l.id !== id));

  const handleCreate = () => {
    if (!supplierId || lines.length === 0) { toast.error('Vui lòng chọn NCC và thêm sản phẩm'); return; }
    const supplier = mockSuppliers.find(s => s.id === supplierId);
    const receipt: PurchaseReceipt = {
      id: generateId(), receiptNumber: generateReceiptNumber(),
      supplierId, supplierName: supplier?.name || '',
      lines, totalAmount: lines.reduce((s, l) => s + l.total, 0),
      createdAt: new Date().toISOString(), createdBy: user?.username || '',
    };
    setReceipts(prev => [receipt, ...prev]);
    toast.success(`Tạo phiếu nhập ${receipt.receiptNumber} thành công! Kho đã được cập nhật.`);
    setDialogOpen(false);
    setSupplierId('');
    setLines([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nhập hàng</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Tạo phiếu nhập</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Số phiếu</TableHead>
                  <TableHead>Nhà cung cấp</TableHead>
                  <TableHead className="text-right">Tổng tiền</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Người tạo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.receiptNumber}</TableCell>
                    <TableCell>{r.supplierName}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(r.totalAmount)}</TableCell>
                    <TableCell className="text-sm">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell>{r.createdBy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Tạo phiếu nhập hàng</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nhà cung cấp</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder="Chọn NCC" /></SelectTrigger>
                <SelectContent>
                  {mockSuppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Danh sách sản phẩm</Label>
                <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" /> Thêm dòng</Button>
              </div>
              {lines.map(line => (
                <div key={line.id} className="flex gap-2 mb-2 items-end">
                  <div className="flex-1">
                    <Select value={line.productId} onValueChange={v => updateLine(line.id, 'productId', v)}>
                      <SelectTrigger className="text-xs"><SelectValue placeholder="Chọn SP" /></SelectTrigger>
                      <SelectContent>
                        {mockProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input className="w-20" type="number" placeholder="SL" value={line.quantity} onChange={e => updateLine(line.id, 'quantity', Number(e.target.value))} />
                  <Input className="w-28" type="number" placeholder="Giá" value={line.costPrice} onChange={e => updateLine(line.id, 'costPrice', Number(e.target.value))} />
                  <span className="text-sm w-28 text-right font-medium">{formatCurrency(line.total)}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeLine(line.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
              {lines.length > 0 && (
                <div className="text-right font-bold text-lg mt-2">
                  Tổng: {formatCurrency(lines.reduce((s, l) => s + l.total, 0))}
                </div>
              )}
            </div>

            <Button className="w-full" onClick={handleCreate}>Tạo phiếu nhập</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchasesPage;
