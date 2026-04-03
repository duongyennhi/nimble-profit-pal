import React, { useState } from 'react';
import { mockProducts, mockCategories } from '@/data/mock';
import { Product } from '@/types';
import { formatCurrency } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { generateId } from '@/lib/format';

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const emptyProduct: Omit<Product, 'id'> = {
    code: '', name: '', categoryId: '', unit: 'Cái', barcode: '',
    costPrice: 0, salePrice: 0, stock: 0, minStock: 0, status: 'active',
  };
  const [form, setForm] = useState<Omit<Product, 'id'>>(emptyProduct);

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || p.categoryId === catFilter;
    return matchSearch && matchCat;
  });

  const openCreate = () => { setEditProduct(null); setForm(emptyProduct); setDialogOpen(true); };
  const openEdit = (p: Product) => {
    setEditProduct(p);
    const { id, ...rest } = p;
    setForm(rest);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.code) { toast.error('Vui lòng nhập mã và tên sản phẩm'); return; }
    if (editProduct) {
      setProducts(prev => prev.map(p => p.id === editProduct.id ? { ...form, id: editProduct.id } : p));
      toast.success('Cập nhật sản phẩm thành công!');
    } else {
      setProducts(prev => [...prev, { ...form, id: generateId() }]);
      toast.success('Thêm sản phẩm thành công!');
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sản phẩm</h1>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Thêm mới</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm theo tên hoặc mã..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Danh mục" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {mockCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Tên sản phẩm</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead className="text-right">Giá nhập</TableHead>
                  <TableHead className="text-right">Giá bán</TableHead>
                  <TableHead className="text-right">Tồn kho</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.code}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{mockCategories.find(c => c.id === p.categoryId)?.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.costPrice)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.salePrice)}</TableCell>
                    <TableCell className="text-right">
                      <span className={p.stock <= p.minStock ? 'text-destructive font-bold' : ''}>
                        {p.stock}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>
                        {p.status === 'active' ? 'Hoạt động' : 'Ngưng'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Mã SP</Label>
              <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Tên SP</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Danh mục</Label>
              <Select value={form.categoryId} onValueChange={v => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                <SelectContent>
                  {mockCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Đơn vị</Label>
              <Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Barcode</Label>
              <Input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Giá nhập</Label>
              <Input type="number" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>Giá bán</Label>
              <Input type="number" value={form.salePrice} onChange={e => setForm({ ...form, salePrice: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>Tồn kho tối thiểu</Label>
              <Input type="number" value={form.minStock} onChange={e => setForm({ ...form, minStock: Number(e.target.value) })} />
            </div>
          </div>
          <Button className="w-full mt-3" onClick={handleSave}>Lưu</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductsPage;
