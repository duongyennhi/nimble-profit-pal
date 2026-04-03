import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { revenueChartData, mockProducts } from '@/data/mock';
import { toast } from 'sonner';

const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState('revenue');
  const [period, setPeriod] = useState('week');

  const handleExport = () => {
    toast.success('Xuất file Excel thành công! (Demo)');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Báo cáo</h1>
        <Button onClick={handleExport}><Download className="h-4 w-4 mr-1" /> Xuất Excel</Button>
      </div>

      <div className="flex gap-3">
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="revenue">Doanh thu</SelectItem>
            <SelectItem value="profit">Lợi nhuận</SelectItem>
            <SelectItem value="inventory">Tồn kho</SelectItem>
          </SelectContent>
        </Select>
        {reportType !== 'inventory' && (
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Theo ngày</SelectItem>
              <SelectItem value="week">Theo tuần</SelectItem>
              <SelectItem value="month">Theo tháng</SelectItem>
              <SelectItem value="quarter">Theo quý</SelectItem>
              <SelectItem value="year">Theo năm</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {reportType !== 'inventory' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {reportType === 'revenue' ? 'Biểu đồ doanh thu' : 'Biểu đồ lợi nhuận'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={v => `${(v / 1000000).toFixed(1)}tr`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar
                  dataKey={reportType === 'revenue' ? 'revenue' : 'profit'}
                  name={reportType === 'revenue' ? 'Doanh thu' : 'Lợi nhuận'}
                  fill={reportType === 'revenue' ? 'hsl(220, 70%, 50%)' : 'hsl(160, 60%, 45%)'}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">Báo cáo tồn kho</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã</TableHead>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead className="text-right">Tồn kho</TableHead>
                    <TableHead className="text-right">Tồn tối thiểu</TableHead>
                    <TableHead className="text-right">Giá trị tồn</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockProducts.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.code}</TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="text-right">{p.stock}</TableCell>
                      <TableCell className="text-right">{p.minStock}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.stock * p.costPrice)}</TableCell>
                      <TableCell>
                        {p.stock <= p.minStock ? (
                          <Badge variant="destructive">Thấp</Badge>
                        ) : (
                          <Badge variant="default">Đủ</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReportsPage;
