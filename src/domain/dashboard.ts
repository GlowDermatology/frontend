export const DASHBOARD_RANGES = ["today", "week", "month"] as const;
export type DashboardRange = (typeof DASHBOARD_RANGES)[number];

export interface SeriesPoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface DashboardData {
  range: DashboardRange;
  /** Human label of the bucket size, e.g. "Soatlar bo‘yicha". */
  axisNote: string;
  /** Three evenly spaced x-axis labels. */
  axisLabels: [string, string, string];
  series: SeriesPoint[];
  stats: {
    newCustomers: number;
    ordersNote: string;
    totalCustomers: number;
    deletedCustomers: number;
    outOfStock: number;
  };
  attention: {
    btsFailed: number;
    pendingAppointments: number;
    nextAppointmentAt: string | null;
    newFromBillz: number;
  };
}
