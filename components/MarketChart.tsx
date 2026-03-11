"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function MarketChart({ history }: { history: number[] }) {
  const data = history.map((price: number, index: number) => ({
    day: index + 1,
    price: Number(price.toFixed(2)),
  }));
  const minPrice = Math.min(...history);
  const maxPrice = Math.max(...history);
  const buffer = (maxPrice - minPrice) * 0.1;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorPriceMobile" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="hsl(var(--primary))"
              stopOpacity={0.3}
            />
            <stop
              offset="95%"
              stopColor="hsl(var(--primary))"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          vertical={false}
        />
        <XAxis
          dataKey="day"
          stroke="hsl(var(--muted-foreground))"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          dy={8}
        />
        <YAxis
          domain={[Math.max(0, minPrice - buffer), maxPrice + buffer]}
          stroke="hsl(var(--muted-foreground))"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickFormatter={(v: number) => `$${v}`}
          tickLine={false}
          axisLine={false}
          dx={-8}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            borderColor: "hsl(var(--border))",
            borderRadius: "12px",
          }}
          itemStyle={{
            color: "hsl(var(--foreground))",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
          }}
          labelStyle={{
            color: "hsl(var(--muted-foreground))",
            marginBottom: "4px",
            fontSize: "11px",
          }}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorPriceMobile)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
