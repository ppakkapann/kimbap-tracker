"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/calculations";
import {
  FOOD_COST_TARGET,
  type AccountingChartsData,
} from "@/lib/accounting-charts";

const CHART_TOOLTIP = {
  contentStyle: {
    background: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "0.625rem",
    color: "var(--text-primary)",
    fontSize: "0.75rem",
  },
  itemStyle: { color: "var(--text-secondary)" },
  labelStyle: { color: "var(--text-muted)" },
};

function foodCostLineColor(value: number | null | undefined): string {
  if (value == null || value <= 0) return "#8b9dc3";
  if (value <= FOOD_COST_TARGET.max) return "#2dd4a0";
  if (value <= FOOD_COST_TARGET.max + 5) return "#f4b740";
  return "#f16f65";
}

export function DailyFoodCostChart({
  data,
}: {
  data: AccountingChartsData["dailyFoodCost"];
}) {
  const chartData = data.map((point) => ({
    ...point,
    targetMin: FOOD_COST_TARGET.min,
    targetMax: FOOD_COST_TARGET.max,
  }));
  const values = data
    .map((point) => point.foodCostPercent)
    .filter((value): value is number => value != null);
  const maxY = Math.max(
    FOOD_COST_TARGET.max + 8,
    ...values,
    FOOD_COST_TARGET.min
  );

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, Math.ceil(maxY / 5) * 5]}
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={34}
          tickFormatter={(value) => `${value}%`}
        />
        <ReferenceArea
          y1={FOOD_COST_TARGET.min}
          y2={FOOD_COST_TARGET.max}
          fill="rgba(45, 212, 160, 0.12)"
          strokeOpacity={0}
        />
        <ReferenceLine
          y={FOOD_COST_TARGET.min}
          stroke="rgba(45, 212, 160, 0.45)"
          strokeDasharray="4 4"
        />
        <ReferenceLine
          y={FOOD_COST_TARGET.max}
          stroke="rgba(45, 212, 160, 0.45)"
          strokeDasharray="4 4"
        />
        <Tooltip
          {...CHART_TOOLTIP}
          formatter={(value, name) => {
            if (name === "foodCostPercent") {
              return [
                typeof value === "number" ? `${value.toFixed(1)}%` : "—",
                "Food Cost",
              ];
            }
            return [value, name];
          }}
          labelFormatter={(_, payload) => {
            const row = payload?.[0]?.payload;
            if (!row) return "";
            return `${row.label} · รายได้ ${formatCurrency(row.revenue)}`;
          }}
        />
        <Line
          type="monotone"
          dataKey="foodCostPercent"
          stroke="#14a8b8"
          strokeWidth={2}
          dot={(props) => {
            const { cx, cy, payload } = props;
            if (cx == null || cy == null) return null;
            return (
              <circle
                cx={cx}
                cy={cy}
                r={3}
                fill={foodCostLineColor(payload.foodCostPercent)}
                stroke="var(--bg-surface)"
                strokeWidth={1.5}
              />
            );
          }}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function CostMixChart({ data }: { data: AccountingChartsData["costMix"] }) {
  if (data.length === 0) {
    return (
      <div className="accounting-chart-empty">
        <p>ยังไม่มีข้อมูลต้นทุนในเดือนนี้</p>
      </div>
    );
  }

  const total = data.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={58}
          outerRadius={86}
          paddingAngle={2}
          stroke="var(--bg-surface)"
          strokeWidth={2}
        >
          {data.map((slice) => (
            <Cell key={slice.key} fill={slice.color} />
          ))}
        </Pie>
        <Tooltip
          {...CHART_TOOLTIP}
          formatter={(value, _name, item) => {
            const amount = typeof value === "number" ? value : 0;
            const pct = total > 0 ? (amount / total) * 100 : 0;
            return [
              `${formatCurrency(amount)} (${pct.toFixed(1)}%)`,
              item.payload.name,
            ];
          }}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          formatter={(value) => (
            <span style={{ color: "var(--text-secondary)", fontSize: "0.6875rem" }}>
              {value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function WaterfallChart({ data }: { data: AccountingChartsData["waterfall"] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={52}
          tickFormatter={(value) =>
            value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)
          }
        />
        <Tooltip
          {...CHART_TOOLTIP}
          cursor={false}
          formatter={(_value, _name, item) => [
            formatCurrency(item.payload.display),
            item.payload.name,
          ]}
        />
        <Bar dataKey="offset" stackId="waterfall" fill="transparent" />
        <Bar dataKey="value" stackId="waterfall" radius={[6, 6, 0, 0]}>
          {data.map((step) => (
            <Cell key={step.name} fill={step.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlyTrendChart({
  data,
}: {
  data: AccountingChartsData["monthlyTrend"];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
        <XAxis
          dataKey="monthLabel"
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={52}
          tickFormatter={(value) =>
            value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)
          }
        />
        <Tooltip
          {...CHART_TOOLTIP}
          formatter={(value, name) => [
            formatCurrency(typeof value === "number" ? value : 0),
            name === "revenue" ? "รายได้" : "กำไรขั้นต้น",
          ]}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          formatter={(value) =>
            value === "revenue" ? "รายได้" : "กำไรขั้นต้น"
          }
        />
        <Bar dataKey="revenue" name="revenue" fill="#14a8b8" radius={[5, 5, 0, 0]} />
        <Bar
          dataKey="grossProfit"
          name="grossProfit"
          fill="#2dd4a0"
          radius={[5, 5, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ReportsCostAnalysis({
  data,
}: {
  data: AccountingChartsData;
}) {
  return (
    <section>
      <div className="accounting-section-heading">
        <div>
          <h2>ตัวขับเคลื่อนต้นทุน</h2>
          <p>ดูว่าต้นทุนส่วนไหนกดกำไร และ Food Cost เปลี่ยนอย่างไร</p>
        </div>
      </div>
      <div className="accounting-charts">
        <article className="accounting-chart-card">
          <div className="accounting-chart-head">
            <h3>Food Cost รายวัน</h3>
            <p>
              แถบเขียว = เป้า {FOOD_COST_TARGET.min}–{FOOD_COST_TARGET.max}%
            </p>
          </div>
          <DailyFoodCostChart data={data.dailyFoodCost} />
        </article>

        <article className="accounting-chart-card">
          <div className="accounting-chart-head">
            <h3>สัดส่วนต้นทุน</h3>
            <p>วัตถุดิบ · ค่าแรง · ของเสีย · ค่าใช้จ่ายอื่น</p>
          </div>
          <CostMixChart data={data.costMix} />
        </article>

        <article className="accounting-chart-card accounting-chart-card--wide">
          <div className="accounting-chart-head">
            <h3>เปรียบเทียบรายเดือน</h3>
            <p>รายได้เทียบกำไรขั้นต้น · 6 เดือนล่าสุด</p>
          </div>
          <MonthlyTrendChart data={data.monthlyTrend} />
        </article>
      </div>
    </section>
  );
}

export function AccountingWaterfall({
  data,
}: {
  data: AccountingChartsData["waterfall"];
}) {
  return (
    <section className="accounting-waterfall-section">
      <article className="accounting-chart-card">
        <div className="accounting-chart-head">
          <h3>งบกำไรขาดทุน</h3>
          <p>รายได้ → ต้นทุนขาย → ค่าใช้จ่าย → กำไรสุทธิ</p>
        </div>
        <WaterfallChart data={data} />
      </article>
    </section>
  );
}
