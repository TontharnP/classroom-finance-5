"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type CashflowChartPoint = {
  date: string;
  label: string;
  income: number;
  expense: number;
  net: number;
};

function money(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function DashboardCashflowChart({ data }: { data: CashflowChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
      <ComposedChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line-strong)" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis
          tickFormatter={(value: number) => money(value)}
          tickLine={false}
          axisLine={false}
          fontSize={12}
          width={48}
        />
        <Tooltip
          formatter={(value: number, name: string) => {
            const labels: Record<string, string> = {
              income: "รายรับ",
              expense: "รายจ่าย",
              net: "สุทธิ",
            };
            return [`${money(value)} ฿`, labels[name] || name];
          }}
          labelFormatter={(label) => `วันที่ ${label}`}
        />
        <Bar dataKey="income" fill="var(--cyan)" radius={[8, 8, 0, 0]} name="รายรับ" />
        <Bar dataKey="expense" fill="var(--danger)" radius={[8, 8, 0, 0]} name="รายจ่าย" />
        <Line
          type="monotone"
          dataKey="net"
          stroke="var(--primary)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          name="สุทธิ"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
