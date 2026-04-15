import React, { useEffect, useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/format';
import { PaymentMethod } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, CreditCard, Banknote, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { getProductsApi } from '@/services/productService';
import { createSalesInvoiceApi } from '@/services/salesService';

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

type SalesLineUi = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  unit: string;
  stock: number;
  productType: 'ingredient' | 'dish' | 'drink' | 'supply';
};

const generateLineId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const SalesPage: React.FC = () => {
  const navigate = useNavigate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [products, setProducts] = useState<ProductApi[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<SalesLineUi[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customerPaid, setCustomerPaid] = useState(0);

  const sellableProducts = useMemo(() => {
    return products.filter((product) => {
      const canSell = product.can_sell === true || Number(product.can_sell) === 1;
      return product.status === 'active' && canSell;
    });
  }, [products]);

  const subtotal = lines.reduce((sum, line) => sum + Number(line.total || 0), 0);
  const total = Math.max(0, subtotal - Number(discount || 0));
  const change =
    paymentMethod === 'cash'
      ? Math.max(0, Number(customerPaid || 0) - total)
      : 0;

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const data = await getProductsApi();
      setProducts(data.products || []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lỗi tải sản phẩm bán hàng';
      toast.error(message);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const resetForm = () => {
    setCustomerName('');
    setNote('');
    setLines([]);
    setDiscount(0);
    setPaymentMethod('cash');
    setCustomerPaid(0);
  };

  const openCreateInvoice = () => {
    resetForm();
    setDialogOpen(true);
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: generateLineId(),
        productId: '',
        productName: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        total: 0,
        unit: '',
        stock: 0,
        productType: 'dish',
      },
    ]);
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((line) => line.id !== id));
  };

  const updateLine = (
    id: string,
    field: 'productId' | 'quantity' | 'discount',
    value: string | number
  ) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;

        const updated = { ...line };

        if (field === 'productId') {
          updated.productId = String(value);

          const product = sellableProducts.find(
            (p) => String(p.id) === String(value)
          );

          if (product) {
            updated.productName = product.name;
            updated.unitPrice = Number(product.sale_price || 0);
            updated.unit = product.unit || '';
            updated.stock = Number(product.stock_quantity || 0);
            updated.productType =
              (product.product_type as SalesLineUi['productType']) || 'dish';
          } else {
            updated.productName = '';
            updated.unitPrice = 0;
            updated.unit = '';
            updated.stock = 0;
            updated.productType = 'dish';
          }
        }

        if (field === 'quantity') {
          updated.quantity = Number(value);
        }

        if (field === 'discount') {
          updated.discount = Number(value);
        }

        updated.total =
          Number(updated.quantity) * Number(updated.unitPrice) -
          Number(updated.discount || 0);

        return updated;
      })
    );
  };

  const validateInvoice = () => {
    if (lines.length === 0) {
      toast.error('Vui lòng thêm sản phẩm');
      return false;
    }

    const hasInvalidLine = lines.some(
      (line) =>
        !line.productId ||
        Number(line.quantity) <= 0 ||
        Number(line.unitPrice) < 0 ||
        Number(line.discount) < 0
    );

    if (hasInvalidLine) {
      toast.error('Vui lòng kiểm tra lại sản phẩm, số lượng hoặc giảm giá');
      return false;
    }

    const overStockLine = lines.find((line) => {
      if (line.productType === 'drink' || line.productType === 'supply') {
        return Number(line.quantity) > Number(line.stock || 0);
      }
      return false;
    });

    if (overStockLine) {
      toast.error(`Sản phẩm "${overStockLine.productName}" không đủ tồn kho`);
      return false;
    }

    if (paymentMethod === 'cash' && Number(customerPaid || 0) < total) {
      toast.error('Số tiền khách trả không đủ');
      return false;
    }

    return true;
  };

  const handleCreate = async () => {
    if (!validateInvoice()) return;

    try {
      const payload = {
        customer_name: customerName?.trim() || 'Khách lẻ',
        note: note?.trim() || '',
        discount_amount: Number(discount || 0),
        payment_method: paymentMethod,
        customer_paid:
          paymentMethod === 'cash' ? Number(customerPaid || 0) : total,
        change_amount: paymentMethod === 'cash' ? change : 0,
        lines: lines.map((line) => ({
          product_id: Number(line.productId),
          quantity: Number(line.quantity),
          unit_price: Number(line.unitPrice),
          discount_amount: Number(line.discount || 0),
        })),
      };

      const result = await createSalesInvoiceApi(payload);

      toast.success(`Tạo hóa đơn ${result.invoice_no} thành công`);
      setDialogOpen(false);
      resetForm();
      navigate('/invoices');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lỗi tạo hóa đơn bán';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bán hàng</h1>
          <p className="text-sm text-muted-foreground">
            Tạo hóa đơn bán món ăn, đồ uống cho quán ăn gia đình
          </p>
        </div>

        <Button onClick={openCreateInvoice}>
          <Plus className="mr-1 h-4 w-4" />
          Tạo hóa đơn
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <p className="text-lg">Nhấn "Tạo hóa đơn" để bắt đầu bán hàng</p>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tạo hóa đơn bán hàng</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Tên khách hàng</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Để trống nếu là khách lẻ"
              />
            </div>

            <div className="space-y-1">
              <Label>Ghi chú</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: bàn 2, mang về, ít đá..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Danh sách sản phẩm bán</Label>
                <Button variant="outline" size="sm" onClick={addLine}>
                  <Plus className="mr-1 h-3 w-3" />
                  Thêm
                </Button>
              </div>

              {lines.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Chưa có sản phẩm nào. Bấm <strong>Thêm</strong> để chọn món ăn hoặc đồ uống bán cho khách.
                </div>
              ) : (
                <div className="space-y-3">
                  {lines.map((line) => (
                    <div
                      key={line.id}
                      className="grid grid-cols-1 gap-2 rounded-md border p-3 lg:grid-cols-[2fr_110px_120px_100px_140px_40px]"
                    >
                      <div>
                        <Label className="mb-1 block text-xs">Sản phẩm</Label>
                        <Select
                          value={line.productId}
                          onValueChange={(value) => updateLine(line.id, 'productId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                loadingProducts
                                  ? 'Đang tải sản phẩm...'
                                  : 'Chọn sản phẩm bán'
                              }
                            />
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
                            updateLine(line.id, 'quantity', Number(e.target.value))
                          }
                        />
                        {line.unit && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Đơn vị: {line.unit}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label className="mb-1 block text-xs">Đơn giá bán</Label>
                        <Input
                          type="number"
                          value={line.unitPrice}
                          readOnly
                          className="bg-muted"
                        />
                      </div>

                      <div>
                        <Label className="mb-1 block text-xs">Giảm</Label>
                        <Input
                          type="number"
                          min={0}
                          value={line.discount}
                          onChange={(e) =>
                            updateLine(line.id, 'discount', Number(e.target.value))
                          }
                        />
                      </div>

                      <div>
                        <Label className="mb-1 block text-xs">Thành tiền</Label>
                        <div className="rounded-md border bg-muted px-3 py-2 text-right text-sm font-medium">
                          {formatCurrency(line.total)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground text-right">
                          Tồn kho: {line.stock} {line.unit}
                        </div>
                      </div>

                      <div className="flex items-end justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(line.id)}
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
                <span>{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex justify-between items-center gap-3">
                <span>Chiết khấu hóa đơn:</span>
                <Input
                  className="w-32 text-right"
                  type="number"
                  min={0}
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </div>

              <div className="flex justify-between text-lg font-bold">
                <span>Tổng cộng:</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Phương thức thanh toán</Label>
              <Tabs
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              >
                <TabsList className="w-full">
                  <TabsTrigger value="cash" className="flex-1">
                    <Banknote className="mr-1 h-4 w-4" />
                    Tiền mặt
                  </TabsTrigger>
                  <TabsTrigger value="bank_transfer" className="flex-1">
                    <QrCode className="mr-1 h-4 w-4" />
                    Chuyển khoản
                  </TabsTrigger>
                  <TabsTrigger value="pos" className="flex-1">
                    <CreditCard className="mr-1 h-4 w-4" />
                    POS
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="cash" className="space-y-2 mt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Khách trả</Label>
                      <Input
                        type="number"
                        min={0}
                        value={customerPaid}
                        onChange={(e) => setCustomerPaid(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Tiền thừa</Label>
                      <div className="h-10 flex items-center text-lg font-bold text-green-600">
                        {formatCurrency(change)}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="bank_transfer" className="mt-3">
                  <Card className="bg-muted">
                    <CardContent className="p-4 text-center">
                      <QrCode className="h-20 w-20 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Hiển thị mã QR chuyển khoản tại đây
                      </p>
                      <p className="font-bold mt-2">{formatCurrency(total)}</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="pos" className="mt-3">
                  <Card className="bg-muted">
                    <CardContent className="p-4 text-center">
                      <CreditCard className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Xác nhận thanh toán qua máy POS
                      </p>
                      <p className="font-bold mt-2">{formatCurrency(total)}</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            <Button className="w-full" size="lg" onClick={handleCreate}>
              Thanh toán & Tạo hóa đơn
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesPage;