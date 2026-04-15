import React, { useEffect, useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/format';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPurchasesApi,
  getPurchaseDetailApi,
  createPurchaseApi,
  deletePurchaseApi,
  updatePurchaseApi,
} from '@/services/purchaseService';
import { getProductsApi } from '@/services/productService';
import { getSuppliersApi, createSupplierApi } from '@/services/supplierService';

type PurchaseReceiptApi = {
  id: number;
  receipt_no: string;
  receipt_date: string;
  total_amount: number;
  note?: string | null;
  status: string;
  supplier_name?: string | null;
  created_by?: string | null;
  created_by_id?: number;
  supplier_id?: number;
  lines?: Array<{
    product_id: number;
    product_name?: string;
    quantity: number;
    unit_cost: number;
    unit?: string;
  }>;
};

type SupplierApi = {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  note?: string | null;
};

type ProductApi = {
  id: number;
  code: string;
  name: string;
  unit: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock: number;
  status: 'active' | 'inactive';
  category_id?: number | null;
  category_name?: string | null;
  image_url?: string | null;
  product_type?: 'ingredient' | 'dish' | 'drink' | 'supply';
  can_purchase?: boolean | number;
  can_sell?: boolean | number;
};

type PurchaseLineUi = {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  total: number;
  unit: string;
};

const generateLineId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const PurchasesPage: React.FC = () => {
  const { user } = useAuth();

  const [receipts, setReceipts] = useState<PurchaseReceiptApi[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierApi[]>([]);
  const [products, setProducts] = useState<ProductApi[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);

  const [editingReceipt, setEditingReceipt] = useState<PurchaseReceiptApi | null>(null);

  const [supplierId, setSupplierId] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<PurchaseLineUi[]>([]);

  const [supplierForm, setSupplierForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    note: '',
  });

  const isAdmin = user?.role_code === 'admin' || user?.roleCode === 'admin';

  const fetchAll = async () => {
    try {
      setLoading(true);

      const [purchaseData, supplierData, productData] = await Promise.all([
        getPurchasesApi(),
        getSuppliersApi(),
        getProductsApi(),
      ]);

      setReceipts(purchaseData.receipts || []);
      setSuppliers(supplierData.suppliers || []);
      setProducts(productData.products || []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lỗi tải dữ liệu nhập hàng';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const purchasableProducts = useMemo(() => {
    return products.filter((product) => {
      const canPurchase =
        product.can_purchase === true || Number(product.can_purchase) === 1;
      return product.status === 'active' && canPurchase;
    });
  }, [products]);

  const totalAmount = lines.reduce(
    (sum, line) => sum + Number(line.total || 0),
    0
  );

  const resetPurchaseForm = () => {
    setSupplierId('');
    setNote('');
    setLines([]);
    setEditingReceipt(null);
  };

  const openCreateDialog = () => {
    resetPurchaseForm();
    setDialogOpen(true);
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: generateLineId(),
        product_id: '',
        product_name: '',
        quantity: 1,
        unit_cost: 0,
        total: 0,
        unit: '',
      },
    ]);
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((line) => line.id !== id));
  };

  const updateLine = (
    id: string,
    field: 'product_id' | 'quantity' | 'unit_cost',
    value: string | number
  ) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;

        const updated = { ...line };

        if (field === 'product_id') {
          updated.product_id = String(value);

          const product = purchasableProducts.find(
            (p) => String(p.id) === String(value)
          );

          if (product) {
            updated.product_name = product.name;
            updated.unit_cost = Number(product.cost_price || 0);
            updated.unit = product.unit || '';
            updated.total = Number(updated.quantity) * Number(updated.unit_cost);
          }
        }

        if (field === 'quantity') {
          updated.quantity = Number(value);
          updated.total = Number(updated.quantity) * Number(updated.unit_cost);
        }

        if (field === 'unit_cost') {
          updated.unit_cost = Number(value);
          updated.total = Number(updated.quantity) * Number(updated.unit_cost);
        }

        return updated;
      })
    );
  };

  const handleCreateSupplier = async () => {
    try {
      if (!supplierForm.name.trim()) {
        toast.error('Vui lòng nhập tên nhà cung cấp');
        return;
      }

      const result = await createSupplierApi({
        name: supplierForm.name.trim(),
        phone: supplierForm.phone || undefined,
        email: supplierForm.email || undefined,
        address: supplierForm.address || undefined,
        note: supplierForm.note || undefined,
      });

      toast.success('Thêm nhà cung cấp thành công');

      const supplierData = await getSuppliersApi();
      const updatedSuppliers = supplierData.suppliers || [];
      setSuppliers(updatedSuppliers);

      const newest =
        updatedSuppliers.find((s: SupplierApi) => s.id === result.id) ||
        updatedSuppliers[0];

      if (newest) {
        setSupplierId(String(newest.id));
      }

      setSupplierDialogOpen(false);
      setSupplierForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        note: '',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lỗi thêm nhà cung cấp';
      toast.error(message);
    }
  };

  const handleOpenEdit = async (receipt: PurchaseReceiptApi) => {
    try {
      const isOwner = Number(receipt.created_by_id) === Number(user?.id);
      if (!isAdmin && !isOwner) {
        toast.error('Bạn chỉ có thể sửa phiếu nhập do mình tạo');
        return;
      }

      const data = await getPurchaseDetailApi(receipt.id);
      const detail = data.receipt;

      setEditingReceipt(receipt);
      setSupplierId(String(detail.supplier_id || ''));
      setNote(detail.note || '');

      setLines(
        (detail.lines || []).map((line: any) => ({
          id: generateLineId(),
          product_id: String(line.product_id),
          product_name: line.product_name || '',
          quantity: Number(line.quantity),
          unit_cost: Number(line.unit_cost),
          total: Number(line.quantity) * Number(line.unit_cost),
          unit: line.unit || '',
        }))
      );

      setDialogOpen(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lỗi mở phiếu nhập để sửa';
      toast.error(message);
    }
  };

  const handleSavePurchase = async () => {
    try {
      if (!supplierId) {
        toast.error('Vui lòng chọn nhà cung cấp');
        return;
      }

      if (lines.length === 0) {
        toast.error('Vui lòng thêm ít nhất một mặt hàng');
        return;
      }

      const hasInvalidLine = lines.some(
        (line) =>
          !line.product_id ||
          Number(line.quantity) <= 0 ||
          Number(line.unit_cost) < 0
      );

      if (hasInvalidLine) {
        toast.error('Vui lòng kiểm tra lại sản phẩm, số lượng và giá nhập');
        return;
      }

      const payload = {
        supplier_id: Number(supplierId),
        note,
        lines: lines.map((line) => ({
          product_id: Number(line.product_id),
          quantity: Number(line.quantity),
          unit_cost: Number(line.unit_cost),
        })),
      };

      if (editingReceipt) {
        await updatePurchaseApi(editingReceipt.id, payload);
        toast.success('Cập nhật phiếu nhập thành công');
      } else {
        await createPurchaseApi(payload);
        toast.success('Tạo phiếu nhập thành công');
      }

      setDialogOpen(false);
      resetPurchaseForm();
      fetchAll();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lỗi lưu phiếu nhập';
      toast.error(message);
    }
  };

  const handleDeletePurchase = async (receipt: PurchaseReceiptApi) => {
    const isOwner = Number(receipt.created_by_id) === Number(user?.id);
    if (!isAdmin && !isOwner) {
      toast.error('Bạn chỉ có thể xóa phiếu nhập do mình tạo');
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa phiếu nhập "${receipt.receipt_no}" không?`
    );

    if (!confirmed) return;

    try {
      await deletePurchaseApi(receipt.id);
      toast.success('Xóa phiếu nhập thành công');
      fetchAll();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lỗi xóa phiếu nhập';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nhập hàng</h1>
          <p className="text-sm text-muted-foreground">
            Dùng để nhập nguyên liệu, đồ uống và vật tư cho quán ăn gia đình
          </p>
        </div>

        <Button onClick={openCreateDialog}>
          <Plus className="mr-1 h-4 w-4" />
          Tạo phiếu nhập
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Số phiếu</TableHead>
                  <TableHead>Nhà cung cấp</TableHead>
                  <TableHead className="text-right">Tổng tiền</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Người tạo</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Đang tải dữ liệu...
                    </TableCell>
                  </TableRow>
                ) : receipts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Chưa có phiếu nhập nào
                    </TableCell>
                  </TableRow>
                ) : (
                  receipts.map((receipt) => {
                    const isOwner =
                      Number(receipt.created_by_id) === Number(user?.id);

                    return (
                      <TableRow key={receipt.id}>
                        <TableCell className="font-mono text-xs">
                          {receipt.receipt_no}
                        </TableCell>
                        <TableCell>{receipt.supplier_name || '-'}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(receipt.total_amount || 0))}
                        </TableCell>
                        <TableCell className="text-sm">
                          {receipt.receipt_date
                            ? new Date(receipt.receipt_date).toLocaleDateString(
                                'vi-VN'
                              )
                            : '-'}
                        </TableCell>
                        <TableCell>{receipt.created_by || '-'}</TableCell>
                        <TableCell>
                          {(isAdmin || isOwner) && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEdit(receipt)}
                              >
                                <Pencil className="mr-1 h-4 w-4" />
                                Sửa
                              </Button>

                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeletePurchase(receipt)}
                              >
                                Xóa
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            resetPurchaseForm();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingReceipt ? 'Sửa phiếu nhập hàng' : 'Tạo phiếu nhập hàng'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_auto]">
              <div className="space-y-1">
                <Label>Nhà cung cấp</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn nhà cung cấp" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={String(supplier.id)}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => setSupplierDialogOpen(true)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Thêm NCC
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Ghi chú</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: hàng giao sáng, nhập thêm cá và nước ngọt..."
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Danh sách mặt hàng nhập</Label>
                <Button variant="outline" size="sm" onClick={addLine}>
                  <Plus className="mr-1 h-3 w-3" />
                  Thêm dòng
                </Button>
              </div>

              {lines.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Chưa có mặt hàng nào. Bấm <strong>Thêm dòng</strong> để chọn
                  nguyên liệu, đồ uống hoặc vật tư cần nhập.
                </div>
              ) : (
                <div className="space-y-3">
                  {lines.map((line) => (
                    <div
                      key={line.id}
                      className="grid grid-cols-1 gap-2 rounded-md border p-3 lg:grid-cols-[2fr_90px_120px_130px_40px]"
                    >
                      <div>
                        <Label className="mb-1 block text-xs">Sản phẩm</Label>
                        <Select
                          value={line.product_id}
                          onValueChange={(value) =>
                            updateLine(line.id, 'product_id', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn sản phẩm nhập kho" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchasableProducts.map((product) => (
                              <SelectItem
                                key={product.id}
                                value={String(product.id)}
                              >
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="mb-1 block text-xs">
                            Số lượng{line.unit ? ` (${line.unit})` : ''}</Label>
                        <Input
                          type="number"
                          min={0}
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(
                              line.id,
                              'quantity',
                              Number(e.target.value)
                            )
                          }
                        />
                        {line.unit && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Đơn vị: {line.unit}
                        </div>
                      )}
                      </div>

                      <div>
                        <Label className="mb-1 block text-xs">Giá nhập</Label>
                        <Input
                          type="number"
                          min={0}
                          value={line.unit_cost}
                          onChange={(e) =>
                            updateLine(
                              line.id,
                              'unit_cost',
                              Number(e.target.value)
                            )
                          }
                        />
                      </div>

                      <div>
                        <Label className="mb-1 block text-xs">Thành tiền</Label>
                        <div className="rounded-md border bg-muted px-3 py-2 text-right text-sm font-medium">
                          {formatCurrency(line.total)}
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

              {lines.length > 0 && (
                <div className="mt-4 text-right text-lg font-bold">
                  Tổng phiếu nhập: {formatCurrency(totalAmount)}
                </div>
              )}
            </div>

            <Button className="w-full" onClick={handleSavePurchase}>
              {editingReceipt ? 'Lưu cập nhật phiếu nhập' : 'Tạo phiếu nhập'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Thêm nhà cung cấp mới</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Tên nhà cung cấp</Label>
              <Input
                value={supplierForm.name}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, name: e.target.value })
                }
                placeholder="Ví dụ: Vựa cá Chú Ba"
              />
            </div>

            <div className="space-y-1">
              <Label>Số điện thoại</Label>
              <Input
                value={supplierForm.phone}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, phone: e.target.value })
                }
                placeholder="090..."
              />
            </div>

            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                value={supplierForm.email}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, email: e.target.value })
                }
                placeholder="example@email.com"
              />
            </div>

            <div className="space-y-1">
              <Label>Địa chỉ</Label>
              <Input
                value={supplierForm.address}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, address: e.target.value })
                }
                placeholder="Địa chỉ nhà cung cấp"
              />
            </div>

            <div className="space-y-1">
              <Label>Ghi chú</Label>
              <Input
                value={supplierForm.note}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, note: e.target.value })
                }
                placeholder="Ví dụ: chuyên giao sáng sớm"
              />
            </div>

            <Button className="w-full" onClick={handleCreateSupplier}>
              Lưu nhà cung cấp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchasesPage;