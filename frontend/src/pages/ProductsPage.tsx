import React, { useEffect, useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Label } from '@/components/ui/label';
import { Plus, Search, Edit, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  getProductsApi,
  createProductApi,
  updateProductApi,
  updateProductStatusApi,
  deleteProductApi,
} from '@/services/productService';

type ProductType = 'ingredient' | 'dish' | 'drink' | 'supply';

type ProductApiItem = {
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
  product_type?: ProductType;
  can_purchase?: boolean;
  can_sell?: boolean;
};

const PRODUCT_TYPE_OPTIONS: { value: ProductType; label: string; prefix: string }[] = [
  { value: 'ingredient', label: 'Nguyên liệu', prefix: 'NL' },
  { value: 'dish', label: 'Món ăn', prefix: 'MA' },
  { value: 'drink', label: 'Đồ uống', prefix: 'DU' },
  { value: 'supply', label: 'Vật tư', prefix: 'VT' },
];

const emptyForm = {
  code: '',
  name: '',
  category_id: '',
  unit: 'kg',
  cost_price: 0,
  sale_price: 0,
  min_stock: 0,
  status: 'active' as 'active' | 'inactive',
  image_url: '',
  product_type: 'ingredient' as ProductType,
  can_purchase: true,
  can_sell: false,
};

const getTypeMeta = (type: ProductType) =>
  PRODUCT_TYPE_OPTIONS.find((item) => item.value === type);

const getDefaultUnitByType = (type: ProductType) => {
  switch (type) {
    case 'ingredient':
      return 'kg';
    case 'dish':
      return 'phần';
    case 'drink':
      return 'lon';
    case 'supply':
      return 'cái';
    default:
      return 'cái';
  }
};

const getFlagsByType = (type: ProductType) => {
  switch (type) {
    case 'ingredient':
      return { can_purchase: true, can_sell: false };
    case 'dish':
      return { can_purchase: false, can_sell: true };
    case 'drink':
      return { can_purchase: true, can_sell: true };
    case 'supply':
      return { can_purchase: true, can_sell: false };
    default:
      return { can_purchase: true, can_sell: false };
  }
};

const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role_code === 'admin' || user?.roleCode === 'admin';

  const [products, setProducts] = useState<ProductApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductApiItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await getProductsApi();
      setProducts(data.products || data || []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lỗi tải danh sách sản phẩm';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => {
      if (p.category_id && p.category_name) {
        map.set(String(p.category_id), p.category_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [products]);

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    const matchType =
      typeFilter === 'all' || (p.product_type || '') === typeFilter;
    return matchSearch && matchType;
  });

  const generateNextCode = (type: ProductType) => {
    const prefix = getTypeMeta(type)?.prefix || 'SP';
    const sameTypeCodes = products
      .filter((p) => (p.product_type || 'ingredient') === type)
      .map((p) => p.code)
      .filter((code) => code.startsWith(prefix));

    const maxNumber = sameTypeCodes.reduce((max, code) => {
      const num = Number(code.replace(prefix, '')) || 0;
      return Math.max(max, num);
    }, 0);

    return `${prefix}${String(maxNumber + 1).padStart(3, '0')}`;
  };

  const applyTypePreset = (type: ProductType) => {
    const flags = getFlagsByType(type);
    setForm((prev) => ({
      ...prev,
      product_type: type,
      code: editProduct ? prev.code : generateNextCode(type),
      unit: getDefaultUnitByType(type),
      can_purchase: flags.can_purchase,
      can_sell: flags.can_sell,
    }));
  };

  const openCreate = () => {
    const defaultType: ProductType = 'ingredient';
    setEditProduct(null);
    setForm({
      ...emptyForm,
      code: generateNextCode(defaultType),
      unit: getDefaultUnitByType(defaultType),
      product_type: defaultType,
      ...getFlagsByType(defaultType),
    });
    setDialogOpen(true);
  };

  const openEdit = (p: ProductApiItem) => {
    const type = p.product_type || 'ingredient';
    setEditProduct(p);
    setForm({
      code: p.code,
      name: p.name,
      category_id: p.category_id ? String(p.category_id) : '',
      unit: p.unit,
      cost_price: Number(p.cost_price || 0),
      sale_price: Number(p.sale_price || 0),
      min_stock: Number(p.min_stock || 0),
      status: p.status,
      image_url: p.image_url || '',
      product_type: type,
      can_purchase:
        typeof p.can_purchase === 'boolean'
          ? p.can_purchase
          : getFlagsByType(type).can_purchase,
      can_sell:
        typeof p.can_sell === 'boolean'
          ? p.can_sell
          : getFlagsByType(type).can_sell,
    });
    setDialogOpen(true);
  };

  const handleTypeChange = (type: ProductType) => {
    applyTypePreset(type);
  };

  const handleSave = async () => {
    try {
      if (!form.name.trim()) {
        toast.error('Vui lòng nhập tên sản phẩm');
        return;
      }

      if (!form.code) {
        toast.error('Mã sản phẩm chưa được tạo');
        return;
      }

      if (form.cost_price < 0 || form.sale_price < 0 || form.min_stock < 0) {
        toast.error('Giá và tồn kho tối thiểu không được âm');
        return;
      }

      const payload = {
        code: form.code,
        name: form.name,
        category_id: form.category_id ? Number(form.category_id) : null,
        unit: form.unit,
        cost_price: Number(form.cost_price),
        sale_price: Number(form.sale_price),
        min_stock: Number(form.min_stock),
        status: form.status,
        image_url: form.image_url || null,
        product_type: form.product_type,
        can_purchase: form.can_purchase,
        can_sell: form.can_sell,
      };

      if (editProduct) {
        await updateProductApi(editProduct.id, payload);
        toast.success('Cập nhật sản phẩm thành công');
      } else {
        await createProductApi(payload);
        toast.success('Thêm sản phẩm thành công');
      }

      setDialogOpen(false);
      setEditProduct(null);
      fetchProducts();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lỗi lưu sản phẩm';
      toast.error(message);
    }
  };

  const handleToggleStatus = async (product: ProductApiItem) => {
    try {
      const nextStatus = product.status === 'active' ? 'inactive' : 'active';
      await updateProductStatusApi(product.id, nextStatus);
      toast.success('Cập nhật trạng thái sản phẩm thành công');
      fetchProducts();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lỗi cập nhật trạng thái sản phẩm';
      toast.error(message);
    }
  };

  const handleDelete = async (product: ProductApiItem) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa sản phẩm "${product.name}" không?`
    );

    if (!confirmed) return;

    try {
      await deleteProductApi(product.id);
      toast.success('Xóa sản phẩm thành công');
      fetchProducts();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lỗi xóa sản phẩm';
      toast.error(message);
    }
  };

  const renderStockDisplay = (product: ProductApiItem) => {
    const type = product.product_type || 'ingredient';
    const isDish = type === 'dish';

    if (isDish) {
      return <span className="text-muted-foreground">-</span>;
    }

    const stock = Number(product.stock_quantity || 0);
    const minStock = Number(product.min_stock || 0);

    return (
      <span className={stock <= minStock ? 'font-bold text-destructive' : ''}>
        {stock.toFixed(2)} {product.unit}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sản phẩm / Tồn kho</h1>
          <p className="text-sm text-muted-foreground">
            Quản lý nguyên liệu, món ăn, đồ uống và vật tư cho quán ăn gia đình
          </p>
        </div>

        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> Thêm mới
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên hoặc mã..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded-md border px-3 py-2 lg:w-[220px]"
            >
              <option value="all">Tất cả loại</option>
              {PRODUCT_TYPE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ảnh</TableHead>
                  <TableHead>Mã</TableHead>
                  <TableHead>Tên sản phẩm</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead className="text-right">Giá nhập</TableHead>
                  <TableHead className="text-right">Giá bán</TableHead>
                  <TableHead className="text-right">Tồn kho</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">
                      Đang tải dữ liệu...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">
                      Chưa có sản phẩm nào
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="h-12 w-12 rounded-md border object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.code}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getTypeMeta((p.product_type || 'ingredient') as ProductType)?.label ||
                            'Nguyên liệu'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(p.cost_price || 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(p.sale_price || 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {renderStockDisplay(p)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>
                          {p.status === 'active' ? 'Hoạt động' : 'Ngưng'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isAdmin && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                                <Edit className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleStatus(p)}
                              >
                                {p.status === 'active' ? 'Ngưng' : 'Mở lại'}
                              </Button>

                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(p)}
                              >
                                Xóa
                              </Button>
                            </>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Loại sản phẩm</Label>
              <select
                value={form.product_type}
                onChange={(e) => handleTypeChange(e.target.value as ProductType)}
                className="w-full rounded-md border px-3 py-2"
              >
                {PRODUCT_TYPE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label>Mã sản phẩm</Label>
              <Input value={form.code} readOnly className="bg-muted" />
            </div>

            <div className="space-y-1">
              <Label>Tên sản phẩm</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ví dụ: Cá basa, Cơm chiên hải sản, Coca lon..."
              />
            </div>

            <div className="space-y-1">
              <Label>Danh mục</Label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full rounded-md border px-3 py-2"
              >
                <option value="">Chọn danh mục</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label>Đơn vị</Label>
              <Input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="kg, phần, lon, cái..."
              />
            </div>

            <div className="space-y-1">
              <Label>Ảnh sản phẩm (URL)</Label>
              <Input
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-1">
              <Label>Giá nhập</Label>
              <Input
                type="number"
                value={form.cost_price}
                onChange={(e) =>
                  setForm({ ...form, cost_price: Number(e.target.value) })
                }
              />
            </div>

            <div className="space-y-1">
              <Label>Giá bán</Label>
              <Input
                type="number"
                value={form.sale_price}
                onChange={(e) =>
                  setForm({ ...form, sale_price: Number(e.target.value) })
                }
              />
            </div>

            <div className="space-y-1">
              <Label>Tồn kho tối thiểu</Label>
              <Input
                type="number"
                value={form.min_stock}
                onChange={(e) =>
                  setForm({ ...form, min_stock: Number(e.target.value) })
                }
              />
            </div>

            <div className="space-y-1">
              <Label>Trạng thái</Label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as 'active' | 'inactive',
                  })
                }
                className="w-full rounded-md border px-3 py-2"
              >
                <option value="active">Hoạt động</option>
                <option value="inactive">Ngưng</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 rounded-md border p-4 md:grid-cols-2">
            <label className="flex items-center gap-2 opacity-80">
              <input type="checkbox" checked={form.can_purchase} readOnly />
              <span>Cho phép nhập kho</span>
            </label>

            <label className="flex items-center gap-2 opacity-80">
              <input type="checkbox" checked={form.can_sell} readOnly />
              <span>Cho phép bán</span>
            </label>
          </div>

          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            {form.product_type === 'ingredient' &&
              'Nguyên liệu: dùng để nhập kho, ví dụ cá, thịt, rau.'}
            {form.product_type === 'dish' &&
              'Món ăn: dùng để bán cho khách, ví dụ cơm chiên, bún bò.'}
            {form.product_type === 'drink' &&
              'Đồ uống: thường vừa nhập kho vừa bán cho khách.'}
            {form.product_type === 'supply' &&
              'Vật tư: dùng để quản lý kho, ví dụ hộp xốp, khăn giấy.'}
          </div>

          <Button className="mt-3 w-full" onClick={handleSave}>
            Lưu sản phẩm
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductsPage;