import React, { useEffect, useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  Download,
  TrendingUp,
  Wallet,
  Receipt,
  Clock3,
  ShoppingCart,
} from 'lucide-react';
import { toast } from 'sonner';
import { getReportSummaryApi } from '@/services/reportService';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

type RangeType = 'day' | 'week' | 'month' | 'quarter' | 'year';
type MetricType = 'revenue' | 'cost' | 'cashflow_profit';

type ReportResponse = {
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
const BAR_REVENUE = '#2563eb';
const BAR_COST = '#34c38f';
const BAR_CASHFLOW_PROFIT = '#f59e0b';

const formatExcelDate = (value?: string | null) => {
  if (!value) return '';
  return new Date(value).toLocaleString('vi-VN');
};

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

const ReportsPage: React.FC = () => {
  const [range, setRange] = useState<RangeType>('week');
  const [metric, setMetric] = useState<MetricType>('revenue');
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportResponse | null>(null);

  const fetchReport = async (selectedRange: RangeType) => {
    try {
      setLoading(true);
      const data = await getReportSummaryApi(selectedRange);
      setReport(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lỗi tải báo cáo';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(range);
  }, [range]);

  const paymentPieData = useMemo(() => {
    const total = (report?.payment_methods || []).reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );

    return (report?.payment_methods || []).map((item) => {
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
  }, [report]);

  const chartData = useMemo(() => {
    if (!report?.chart) return [];
    return report.chart.map((item) => ({
      ...item,
      revenueLabel: formatCurrency(item.revenue),
      costLabel: formatCurrency(item.cost),
      cashflowProfitLabel: formatCurrency(item.cashflow_profit),
    }));
  }, [report]);

  const exportExcel = async () => {
    if (!report) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bao cao');

    worksheet.properties.defaultRowHeight = 22;
    worksheet.views = [{ state: 'frozen', ySplit: 3 }];

    worksheet.columns = [
      { width: 30 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 26 },
    ];

    const titleStyle = {
      font: { bold: true, size: 16, color: { argb: 'FFFFFFFF' } },
      fill: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: '1F4E78' },
      },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    };

    const sectionStyle = {
      font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
      fill: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: '4472C4' },
      },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    };

    const headerStyle = {
      font: { bold: true },
      fill: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'D9EAF7' },
      },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      border: {
        top: { style: 'thin' as const, color: { argb: 'BFBFBF' } },
        left: { style: 'thin' as const, color: { argb: 'BFBFBF' } },
        bottom: { style: 'thin' as const, color: { argb: 'BFBFBF' } },
        right: { style: 'thin' as const, color: { argb: 'BFBFBF' } },
      },
    };

    const cellBorder = {
      top: { style: 'thin' as const, color: { argb: 'D9D9D9' } },
      left: { style: 'thin' as const, color: { argb: 'D9D9D9' } },
      bottom: { style: 'thin' as const, color: { argb: 'D9D9D9' } },
      right: { style: 'thin' as const, color: { argb: 'D9D9D9' } },
    };

    const currencyFormat = '#,##0';
    const center = { horizontal: 'center' as const, vertical: 'middle' as const };
    const left = { horizontal: 'left' as const, vertical: 'middle' as const };
    const right = { horizontal: 'right' as const, vertical: 'middle' as const };

    worksheet.mergeCells('A1:E1');
    worksheet.getCell('A1').value = 'BÁO CÁO QUẢN LÝ DOANH THU QUÁN ĂN';
    Object.assign(worksheet.getCell('A1'), titleStyle);
    worksheet.getRow(1).height = 28;

    worksheet.mergeCells('A2:E2');
    worksheet.getCell('A2').value =
      range === 'day'
        ? 'Kỳ báo cáo: Theo ngày'
        : range === 'week'
        ? 'Kỳ báo cáo: Theo tuần'
        : range === 'month'
        ? 'Kỳ báo cáo: Theo tháng'
        : range === 'quarter'
        ? 'Kỳ báo cáo: Theo quý'
        : 'Kỳ báo cáo: Theo năm';
    worksheet.getCell('A2').alignment = center;
    worksheet.getCell('A2').font = { italic: true, size: 11 };

    worksheet.mergeCells('A4:E4');
    worksheet.getCell('A4').value = 'TỔNG QUAN';
    Object.assign(worksheet.getCell('A4'), sectionStyle);

    const summaryRows = [
      ['Doanh thu', report.summary.revenue_paid],
      ['Chờ xác nhận chuyển khoản', report.summary.revenue_pending],
      ['Chi nhập hàng', report.summary.total_cost],
      ['Chênh lệch thu chi', report.summary.cashflow_profit],
      ['Số hóa đơn', report.summary.total_invoices],
      ['Số phiếu nhập', report.summary.total_purchases],
    ];

    let rowIndex = 5;
    summaryRows.forEach(([label, value]) => {
      const row = worksheet.getRow(rowIndex);
      row.getCell(1).value = label as string;
      row.getCell(2).value = value as number;

      row.getCell(1).font = { bold: true };
      row.getCell(1).alignment = left;
      row.getCell(2).alignment = typeof value === 'number' ? right : left;

      row.getCell(1).border = cellBorder;
      row.getCell(2).border = cellBorder;

      if (
        [
          'Doanh thu',
          'Chờ xác nhận chuyển khoản',
          'Chi nhập hàng',
          'Chênh lệch thu chi',
        ].includes(String(label))
      ) {
        row.getCell(2).numFmt = currencyFormat;
      }

      rowIndex++;
    });

    rowIndex += 1;

    worksheet.mergeCells(`A${rowIndex}:D${rowIndex}`);
    worksheet.getCell(`A${rowIndex}`).value = 'BIỂU ĐỒ';
    Object.assign(worksheet.getCell(`A${rowIndex}`), sectionStyle);
    rowIndex++;

    const chartHeader = worksheet.getRow(rowIndex);
    ['Mốc', 'Doanh thu', 'Chi nhập hàng', 'Chênh lệch thu chi'].forEach((text, i) => {
      const cell = chartHeader.getCell(i + 1);
      cell.value = text;
      Object.assign(cell, headerStyle);
    });
    rowIndex++;

    report.chart.forEach((item) => {
      const row = worksheet.getRow(rowIndex);
      row.getCell(1).value = item.label;
      row.getCell(2).value = item.revenue;
      row.getCell(3).value = item.cost;
      row.getCell(4).value = item.cashflow_profit;

      for (let i = 1; i <= 4; i++) {
        row.getCell(i).border = cellBorder;
      }

      row.getCell(1).alignment = center;
      row.getCell(2).alignment = right;
      row.getCell(3).alignment = right;
      row.getCell(4).alignment = right;

      row.getCell(2).numFmt = currencyFormat;
      row.getCell(3).numFmt = currencyFormat;
      row.getCell(4).numFmt = currencyFormat;

      rowIndex++;
    });

    rowIndex += 1;

    worksheet.mergeCells(`A${rowIndex}:D${rowIndex}`);
    worksheet.getCell(`A${rowIndex}`).value = 'TOP SẢN PHẨM';
    Object.assign(worksheet.getCell(`A${rowIndex}`), sectionStyle);
    rowIndex++;

    const topHeader = worksheet.getRow(rowIndex);
    ['Tên sản phẩm', 'Số lượng bán', 'Đơn vị', 'Doanh thu'].forEach((text, i) => {
      const cell = topHeader.getCell(i + 1);
      cell.value = text;
      Object.assign(cell, headerStyle);
    });
    rowIndex++;

    report.top_products.forEach((item) => {
      const row = worksheet.getRow(rowIndex);
      row.getCell(1).value = item.name;
      row.getCell(2).value = item.qty_sold;
      row.getCell(3).value = item.unit;
      row.getCell(4).value = item.revenue;

      for (let i = 1; i <= 4; i++) {
        row.getCell(i).border = cellBorder;
      }

      row.getCell(1).alignment = left;
      row.getCell(2).alignment = center;
      row.getCell(3).alignment = center;
      row.getCell(4).alignment = right;
      row.getCell(4).numFmt = currencyFormat;

      rowIndex++;
    });

    rowIndex += 1;

    worksheet.mergeCells(`A${rowIndex}:E${rowIndex}`);
    worksheet.getCell(`A${rowIndex}`).value = 'HÓA ĐƠN GẦN ĐÂY';
    Object.assign(worksheet.getCell(`A${rowIndex}`), sectionStyle);
    rowIndex++;

    const invoiceHeader = worksheet.getRow(rowIndex);
    ['Số hóa đơn', 'Khách hàng', 'Tổng tiền', 'Thời gian', 'Trạng thái'].forEach(
      (text, i) => {
        const cell = invoiceHeader.getCell(i + 1);
        cell.value = text;
        Object.assign(cell, headerStyle);
      }
    );
    rowIndex++;

    report.recent_invoices.forEach((item) => {
      const row = worksheet.getRow(rowIndex);
      row.getCell(1).value = item.invoice_no;
      row.getCell(2).value = item.customer_name || 'Khách lẻ';
      row.getCell(3).value = item.total_amount;
      row.getCell(4).value = formatExcelDate(item.invoice_date);
      row.getCell(5).value =
        item.payment_status === 'paid' ? 'Đã thanh toán' : 'Chờ xác nhận';

      for (let i = 1; i <= 5; i++) {
        row.getCell(i).border = cellBorder;
      }

      row.getCell(1).alignment = left;
      row.getCell(2).alignment = left;
      row.getCell(3).alignment = right;
      row.getCell(4).alignment = center;
      row.getCell(5).alignment = center;
      row.getCell(3).numFmt = currencyFormat;

      rowIndex++;
    });

    if (report.low_stock_products.length > 0) {
      rowIndex += 1;

      worksheet.mergeCells(`A${rowIndex}:D${rowIndex}`);
      worksheet.getCell(`A${rowIndex}`).value = 'CẢNH BÁO TỒN KHO THẤP';
      worksheet.getCell(`A${rowIndex}`).font = {
        bold: true,
        size: 12,
        color: { argb: 'FFFFFFFF' },
      };
      worksheet.getCell(`A${rowIndex}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F59E0B' },
      };
      worksheet.getCell(`A${rowIndex}`).alignment = center;
      rowIndex++;

      const stockHeader = worksheet.getRow(rowIndex);
      ['Tên sản phẩm', 'Tồn kho', 'Tối thiểu', 'Đơn vị'].forEach((text, i) => {
        const cell = stockHeader.getCell(i + 1);
        cell.value = text;
        Object.assign(cell, headerStyle);
      });
      rowIndex++;

      report.low_stock_products.forEach((item) => {
        const row = worksheet.getRow(rowIndex);
        row.getCell(1).value = item.name;
        row.getCell(2).value = item.stock_quantity;
        row.getCell(3).value = item.min_stock;
        row.getCell(4).value = item.unit;

        for (let i = 1; i <= 4; i++) {
          row.getCell(i).border = cellBorder;
        }

        row.getCell(1).alignment = left;
        row.getCell(2).alignment = center;
        row.getCell(3).alignment = center;
        row.getCell(4).alignment = center;

        rowIndex++;
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    saveAs(blob, `bao-cao-${range}.xlsx`);
  };

  const cardTitle =
    metric === 'revenue'
      ? 'Biểu đồ doanh thu'
      : metric === 'cost'
      ? 'Biểu đồ chi nhập hàng'
      : 'Biểu đồ chênh lệch thu chi';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-bold">Báo cáo</h1>

        <Button onClick={exportExcel} disabled={!report}>
          <Download className="mr-2 h-4 w-4" />
          Xuất Excel
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as MetricType)}
          className="w-full rounded-md border px-3 py-2 md:w-[220px]"
        >
          <option value="revenue">Doanh thu</option>
          <option value="cost">Chi nhập hàng</option>
          <option value="cashflow_profit">Chênh lệch thu chi</option>
        </select>

        <select
          value={range}
          onChange={(e) => setRange(e.target.value as RangeType)}
          className="w-full rounded-md border px-3 py-2 md:w-[220px]"
        >
          <option value="day">Theo ngày</option>
          <option value="week">Theo tuần</option>
          <option value="month">Theo tháng</option>
          <option value="quarter">Theo quý</option>
          <option value="year">Theo năm</option>
        </select>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Đang tải dữ liệu báo cáo...
          </CardContent>
        </Card>
      ) : !report ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Không có dữ liệu báo cáo
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard
              title="Tổng doanh thu"
              value={formatCurrency(report.summary.revenue_paid)}
              badge="Đã thanh toán"
              icon={<Wallet className="h-4 w-4 text-white" />}
              gradient="from-violet-600 to-indigo-500"
            />

            <StatCard
              title="Chờ xác nhận CK"
              value={formatCurrency(report.summary.revenue_pending)}
              badge="Pending"
              icon={<Clock3 className="h-4 w-4 text-white" />}
              gradient="from-blue-600 to-cyan-500"
            />

            <StatCard
              title="Chi nhập hàng"
              value={formatCurrency(report.summary.total_cost)}
              badge="Chi phí"
              icon={<ShoppingCart className="h-4 w-4 text-white" />}
              gradient="from-sky-600 to-cyan-500"
            />

            <StatCard
              title="Chênh lệch thu chi"
              value={formatCurrency(report.summary.cashflow_profit)}
              badge="Thu chi"
              icon={<TrendingUp className="h-4 w-4 text-white" />}
              gradient="from-orange-500 to-red-500"
            />

            <StatCard
              title="Hóa đơn"
              value={report.summary.total_invoices}
              badge="Số lượng"
              icon={<Receipt className="h-4 w-4 text-white" />}
              gradient="from-emerald-600 to-green-500"
            />
          </div>

          {report.low_stock_products.length > 0 && (
            <Card className="border-amber-300">
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-lg font-semibold">Cảnh báo tồn kho thấp</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {report.low_stock_products.map((item) => (
                    <span
                      key={item.id}
                      className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-sm text-amber-700"
                    >
                      {item.name}: còn {item.stock_quantity} {item.unit}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>{cardTitle}</CardTitle>
              </CardHeader>
              <CardContent className="h-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    barCategoryGap={range === 'month' || range === 'year' ? 6 : 18}
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

                    {range === 'week' ? (
                      <>
                        <Legend />
                        <Bar
                          dataKey="revenue"
                          name="Doanh thu"
                          fill={BAR_REVENUE}
                          radius={[6, 6, 0, 0]}
                          maxBarSize={44}
                        />
                        <Bar
                          dataKey="cost"
                          name="Chi nhập hàng"
                          fill={BAR_COST}
                          radius={[6, 6, 0, 0]}
                          maxBarSize={44}
                        />
                      </>
                    ) : metric === 'revenue' ? (
                      <Bar
                        dataKey="revenue"
                        name="Doanh thu"
                        fill={BAR_REVENUE}
                        radius={[6, 6, 0, 0]}
                        maxBarSize={36}
                      />
                    ) : metric === 'cost' ? (
                      <Bar
                        dataKey="cost"
                        name="Chi nhập hàng"
                        fill={BAR_COST}
                        radius={[6, 6, 0, 0]}
                        maxBarSize={36}
                      />
                    ) : (
                      <Bar
                        dataKey="cashflow_profit"
                        name="Chênh lệch thu chi"
                        fill={BAR_CASHFLOW_PROFIT}
                        radius={[6, 6, 0, 0]}
                        maxBarSize={36}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Phương thức thanh toán</CardTitle>
              </CardHeader>
              <CardContent className="h-[420px]">
                {paymentPieData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    Chưa có dữ liệu
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentPieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={2}
                        stroke="none"
                        label={({ name, percent }) => `${name}: ${percent}%`}
                        labelLine={true}
                      >
                        {paymentPieData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sản phẩm bán chạy</CardTitle>
              </CardHeader>
              <CardContent>
                {report.top_products.length === 0 ? (
                  <div className="text-muted-foreground">Chưa có dữ liệu</div>
                ) : (
                  <div className="space-y-4">
                    {report.top_products.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between border-b pb-3 last:border-b-0"
                      >
                        <div className="flex items-center gap-4">
                          <span className="w-6 text-lg font-bold text-primary">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.qty_sold} {item.unit}
                            </p>
                          </div>
                        </div>
                        <div className="text-right font-semibold">
                          {formatCurrency(item.revenue)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hóa đơn gần đây</CardTitle>
              </CardHeader>
              <CardContent>
                {report.recent_invoices.length === 0 ? (
                  <div className="text-muted-foreground">Chưa có dữ liệu</div>
                ) : (
                  <div className="space-y-4">
                    {report.recent_invoices.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between border-b pb-3 last:border-b-0"
                      >
                        <div>
                          <p className="font-semibold">{item.invoice_no}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.customer_name || 'Khách lẻ'}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-semibold">
                            {formatCurrency(item.total_amount)}
                          </p>
                          <div className="mt-1 flex items-center justify-end gap-2">
                            <span className="rounded-full border px-2 py-0.5 text-xs">
                              {item.payment_method_code === 'cash'
                                ? 'Tiền mặt'
                                : item.payment_method_code === 'bank_qr'
                                ? 'CK'
                                : item.payment_method_code === 'pos'
                                ? 'POS'
                                : 'Khác'}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs ${
                                item.payment_status === 'paid'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {item.payment_status === 'paid'
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
        </>
      )}
    </div>
  );
};

export default ReportsPage;