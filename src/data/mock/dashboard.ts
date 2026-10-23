import type { DashboardRange, SeriesPoint } from "@/domain/dashboard";

/**
 * Chart series from the dashboard design (revenue in thousands of so‘m in the
 * source, stored here in so‘m).
 */

const WEEK_REVENUE = [8640, 9320, 10150, 9870, 11240, 13060, 12480];
const WEEK_ORDERS = [27, 29, 31, 30, 34, 41, 38];

function today(): SeriesPoint[] {
  const revenue = [180, 420, 760, 1120, 1340, 980, 1210, 1460, 1680, 1390, 1050, 610, 280];
  const orders = [1, 2, 3, 4, 4, 3, 4, 4, 5, 4, 2, 1, 1];
  return revenue.map((r, i) => ({
    label: `${String(9 + i).padStart(2, "0")}:00`,
    revenue: r * 1000,
    orders: orders[i] ?? 0,
  }));
}

function week(): SeriesPoint[] {
  const days = [
    "Ya, 18-okt",
    "Du, 19-okt",
    "Se, 20-okt",
    "Ch, 21-okt",
    "Pa, 22-okt",
    "Ju, 23-okt",
    "Sh, 24-okt",
  ];
  return days.map((label, i) => ({
    label,
    revenue: (WEEK_REVENUE[i] ?? 0) * 1000,
    orders: WEEK_ORDERS[i] ?? 0,
  }));
}

function month(): SeriesPoint[] {
  const orders: number[] = [];
  const revenue: number[] = [];
  for (let i = 0; i < 23; i++) {
    const o = Math.round(24 + 6 * Math.sin(i * 0.7) + i * 0.35 + (i % 7 === 5 ? 6 : 0));
    orders.push(o);
    revenue.push(Math.round((o * (300 + 40 * Math.sin(i * 1.3))) / 10) * 10);
  }
  const allOrders = [...orders, ...WEEK_ORDERS];
  const allRevenue = [...revenue, ...WEEK_REVENUE];
  return allOrders.map((o, i) => ({
    label: i < 6 ? `${25 + i}-sen` : `${i - 5}-okt`,
    revenue: (allRevenue[i] ?? 0) * 1000,
    orders: o,
  }));
}

export const DASHBOARD_SERIES: Record<
  DashboardRange,
  {
    series: SeriesPoint[];
    axisNote: string;
    axisLabels: [string, string, string];
    newCustomers: number;
    ordersNote: string;
  }
> = {
  today: {
    series: today(),
    axisNote: "Soatlar bo‘yicha",
    axisLabels: ["09:00", "15:00", "21:00"],
    newCustomers: 14,
    ordersNote: "Kecha: 41 ta",
  },
  week: {
    series: week(),
    axisNote: "Kunlar bo‘yicha",
    axisLabels: ["18-okt", "21-okt", "24-okt"],
    newCustomers: 96,
    ordersNote: "O‘tgan hafta: 212 ta",
  },
  month: {
    series: month(),
    axisNote: "Kunlar bo‘yicha",
    axisLabels: ["25-sen", "9-okt", "24-okt"],
    newCustomers: 402,
    ordersNote: "O‘tgan oy: 905 ta",
  },
};

export const CUSTOMER_TOTALS = { total: 4812, deleted: 61 };
