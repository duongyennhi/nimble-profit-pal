import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  DollarSign,
  FileText,
  AlertTriangle,
  Wallet,
  ShoppingCart,
} from 'lucide-react';
import { toast } from 'sonner';
import { getReportSummaryApi } from '@/services/reportService';

type DashboardReportResponse = {
  summary: {
    revenue_paid: number;
    revenue_pending: number;
    total_cost: number;
    gross_profit: number;
    cashflow_profit: number;
    total_invoices: number;
    paid_invoices: number;
    pending_invoices: number;
    total_purchases: number;
  };
  chart: Array<{
    key: string;
    label: string;
    revenue: number;
    cost: number;
    gross_profit: number;
    cashflow_profit: number;
  }>;
  payment_methods: Array<{
    code: string;
    name: string;
    invoice_count: number;
    amount: number;
  }>;
  top_products: Array<{
    id: number;
    name: string;
    unit: string;
    qty_sold: number;
    revenue: number;
  }>;
  recent_invoices: Array<{
    id: number;
    invoice_no: string;
    customer_name?: string | null;
    total_amount: number;
    invoice_date: string;
    payment_status?: string | null;
    payment_method_code?: string | null;
    payment_method_name?: string | null;
  }>;
  low_stock_products: Array<{
    id: number;
    code: string;
    name: string;
    unit: string;
    stock_quantity: number;
    min_stock: number;
  }>;
};

const COLORS = ['#2563eb', '#34c38f', '#f59e0b', '#ef4444', '#8b5cf6'];

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-lg border bg-white px-3 py-2 shadow-md">
      <p className="mb-2 text-sm font-semibold">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center justify-between gap-4 text-sm">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-medium">
            {formatCurrency(Number(entry.value || 0))}
          </span>
        </div>
      ))}
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0];
  return (
    <div className="rounded-lg border bg-white px-3 py-2 shadow-md">
      <p className="text-sm font-semibold">{item.name}</p>
      <p className="text-sm">{formatCurrency(Number(item.value || 0))}</p>
    </div>
  );
};
const StatCard = ({
  title,
  value,
  badge,
  icon,
  gradient,
}: {
  title: string;
  value: string | number;
  badge: string;
  icon: React.ReactNode;
  gradient: string;
}) => (
  <div className={`rounded-2xl bg-gradient-to-r ${gradient} p-4 text-white shadow-sm`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-white/80">
          {title}
        </p>
        <p className="mt-2 break-words text-base font-bold leading-tight md:text-lg">
          {value}
        </p>
        <span className="mt-2 inline-flex rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
          {badge}
        </span>
      </div>

      <div className="shrink-0 rounded-xl bg-white/15 p-2">
        {icon}
      </div>
    </div>
  </div>
);
const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [todayReport, setTodayReport] = useState<DashboardReportResponse | null>(null);
  const [weekReport, setWeekReport] = useState<DashboardReportResponse | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);

      const [todayData, weekData] = await Promise.all([
        getReportSummaryApi('day'),
        getReportSummaryApi('week'),
      ]);

      setTodayReport(todayData);
      setWeekReport(weekData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lỗi tải bảng điều khiển';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const paymentPieData = useMemo(() => {
    const total = (weekReport?.payment_methods || []).reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );

    return (weekReport?.payment_methods || []).map((item) => {
      const name =
        item.code === 'cash'
          ? 'Tiền mặt'
          : item.code === 'bank_qr'
          ? 'Chuyển khoản'
          : item.code === 'pos'
          ? 'POS'
          : item.name;

      const value = Number(item.amount || 0);
      const percent = total > 0 ? Math.round((value / total) * 100) : 0;

      return {
        name,
        value,
        percent,
      };
    });
  }, [weekReport]);

  const summaryCards = useMemo(() => {
    if (!todayReport || !weekReport) return [];

    return [
      {
        title: 'Tổng doanh thu',
        value: formatCurrency(Number(todayReport.summary.revenue_paid || 0)),
        badge: 'Hôm nay',
        icon: <DollarSign className="h-4 w-4 text-white" />,
        gradient: 'from-violet-600 to-indigo-500',
      },
      {
        title: 'Doanh thu tuần',
        value: formatCurrency(Number(weekReport.summary.revenue_paid || 0)),
        badge: '7 ngày',
        icon: <Wallet className="h-4 w-4 text-white" />,
        gradient: 'from-blue-600 to-cyan-500',
      },
      {
        title: 'Chi nhập hôm nay',
        value: formatCurrency(Number(todayReport.summary.total_cost || 0)),
        badge: 'Chi phí',
        icon: <ShoppingCart className="h-4 w-4 text-white" />,
        gradient: 'from-sky-600 to-cyan-500',
      },
      {
        title: 'Chênh lệch thu chi',
        value: formatCurrency(Number(todayReport.summary.cashflow_profit || 0)),
        badge: 'Hôm nay',
        icon: <FileText className="h-4 w-4 text-white" />,
        gradient: 'from-orange-500 to-red-500',
      },
    ];
  }, [todayReport, weekReport]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Đang tải dữ liệu bảng điều khiển...
        </CardContent>
      </Card>
    );
  }

  if (!todayReport || !weekReport) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Không có dữ liệu bảng điều khiển
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bảng điều khiển</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            badge={card.badge}
            icon={card.icon}
            gradient={card.gradient}
          />
        ))}
      </div>

      {weekReport.low_stock_products.length > 0 && (
        <Card className="border-amber-300">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Cảnh báo tồn kho thấp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {weekReport.low_stock_products.map((item) => (
                <Badge
                  key={item.id}
                  variant="outline"
                  className="border-amber-300 text-amber-700"
                >
                  {item.name}: còn {item.stock_quantity} {item.unit}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Doanh thu & Chi nhập tuần này</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={weekReport.chart}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                barCategoryGap={18}
              >
                <CartesianGrid strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 14 }}
                />
                <YAxis
                  tickFormatter={(value) => `${(value / 1000000).toFixed(1)}tr`}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 13 }}
                />
                <Tooltip
                  content={<CustomBarTooltip />}
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                />
                <Legend />
                <Bar
                  dataKey="revenue"
                  name="Doanh thu"
                  fill="#2563eb"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={42}
                />
                <Bar
                  dataKey="cost"
                  name="Chi nhập hàng"
                  fill="#34c38f"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={42}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Phương thức thanh toán</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentPieData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Chưa có dữ liệu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={2}
                    label={({ name, percent }) => `${name}: ${percent}%`}
                    labelLine={true}
                    stroke="none"
                  >
                    {paymentPieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sản phẩm bán chạy</CardTitle>
          </CardHeader>
          <CardContent>
            {weekReport.top_products.length === 0 ? (
              <div className="text-muted-foreground">Chưa có dữ liệu</div>
            ) : (
              <div className="space-y-3">
                {weekReport.top_products.map((item, i) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 font-bold text-primary">{i + 1}</span>
                      <span>{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground">
                        {item.qty_sold} {item.unit}
                      </span>
                      <span className="ml-3 font-medium">
                        {formatCurrency(item.revenue)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hóa đơn gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            {weekReport.recent_invoices.length === 0 ? (
              <div className="text-muted-foreground">Chưa có dữ liệu</div>
            ) : (
              <div className="space-y-3">
                {weekReport.recent_invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between border-b pb-2 text-sm last:border-0"
                  >
                    <div>
                      <p className="font-medium">{inv.invoice_no}</p>
                      <p className="text-xs text-muted-foreground">
                        {inv.customer_name || 'Khách lẻ'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(inv.total_amount)}
                      </p>
                      <div className="mt-1 flex items-center justify-end gap-2">
                        <Badge variant="outline" className="text-xs">
                          {inv.payment_method_code === 'cash'
                            ? 'Tiền mặt'
                            : inv.payment_method_code === 'bank_qr'
                            ? 'CK'
                            : inv.payment_method_code === 'pos'
                            ? 'POS'
                            : 'Khác'}
                        </Badge>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            inv.payment_status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {inv.payment_status === 'paid'
                            ? 'Đã thanh toán'
                            : 'Chờ xác nhận'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;