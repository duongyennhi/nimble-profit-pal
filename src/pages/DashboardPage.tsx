import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import { mockProducts, mockSalesInvoices, revenueChartData, paymentMethodData, topSellingProducts } from '@/data/mock';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DollarSign, TrendingUp, FileText, AlertTriangle } from 'lucide-react';

const DashboardPage: React.FC = () => {
  const lowStock = mockProducts.filter(p => p.stock <= p.minStock);
  const todayInvoices = mockSalesInvoices;
  const todayRevenue = todayInvoices.reduce((s, i) => s + i.totalAmount, 0);
  const todayProfit = todayInvoices.reduce((s, inv) =>
    s + inv.lines.reduce((ls, l) => ls + (l.unitPrice - l.costPrice) * l.quantity - l.discount, 0), 0);

  const summaryCards = [
    { title: 'Doanh thu hôm nay', value: formatCurrency(todayRevenue), icon: DollarSign, color: 'text-primary' },
    { title: 'Doanh thu tháng', value: formatCurrency(todayRevenue * 28), icon: TrendingUp, color: 'text-success' },
    { title: 'Lợi nhuận hôm nay', value: formatCurrency(todayProfit), icon: TrendingUp, color: 'text-accent' },
    { title: 'Hóa đơn hôm nay', value: String(todayInvoices.length), icon: FileText, color: 'text-info' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bảng điều khiển</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(card => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-lg bg-muted ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-xl font-bold">{card.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <Card className="border-warning/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Cảnh báo tồn kho thấp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStock.map(p => (
                <Badge key={p.id} variant="outline" className="text-warning border-warning/50">
                  {p.name}: còn {p.stock} {p.unit}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Doanh thu & Lợi nhuận tuần này</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis tickFormatter={v => `${(v / 1000000).toFixed(1)}tr`} className="text-xs" />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="revenue" name="Doanh thu" fill="hsl(220, 70%, 50%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Lợi nhuận" fill="hsl(160, 60%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Phương thức thanh toán</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={paymentMethodData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                  {paymentMethodData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top selling & recent invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sản phẩm bán chạy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topSellingProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary w-5">{i + 1}</span>
                    <span>{p.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground">{p.quantity} SP</span>
                    <span className="ml-3 font-medium">{formatCurrency(p.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hóa đơn gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockSalesInvoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{inv.invoiceNumber}</p>
                    <p className="text-muted-foreground text-xs">{inv.customerName || 'Khách lẻ'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(inv.totalAmount)}</p>
                    <Badge variant="outline" className="text-xs">
                      {inv.payment.method === 'cash' ? 'Tiền mặt' : inv.payment.method === 'bank_transfer' ? 'CK' : 'POS'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
