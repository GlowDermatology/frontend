import { createFormatter } from "@/lib/format";
import type { CopySet } from "@/lib/i18n/copy";

/**
 * Dashboard words the data layer builds into `DashboardData` (contract §2.10, §5.7) in uz / ru /
 * en: the chart's bucket note and the orders card's comparison with the period before. The
 * labels of the buckets themselves come from the admin language's formatter.
 */
const uzN = createFormatter("uz").number;
const ruN = createFormatter("ru").number;
const enN = createFormatter("en").number;

const uz = {
  axisNote: { hour: "Soatlar bo‘yicha", day: "Kunlar bo‘yicha" },
  ordersNote: {
    today: (n: number) => `Kecha: ${uzN(n)} ta`,
    week: (n: number) => `O‘tgan hafta: ${uzN(n)} ta`,
    month: (n: number) => `O‘tgan oy: ${uzN(n)} ta`,
    custom: (n: number) => `Oldingi davr: ${uzN(n)} ta`,
  },
};

export type DashboardDataCopy = typeof uz;

export const dashboardDataCopy = {
  uz,
  ru: {
    axisNote: { hour: "По часам", day: "По дням" },
    ordersNote: {
      today: (n: number) => `Вчера: ${ruN(n)}`,
      week: (n: number) => `Прошлая неделя: ${ruN(n)}`,
      month: (n: number) => `Прошлый месяц: ${ruN(n)}`,
      custom: (n: number) => `Предыдущий период: ${ruN(n)}`,
    },
  },
  en: {
    axisNote: { hour: "By hour", day: "By day" },
    ordersNote: {
      today: (n: number) => `Yesterday: ${enN(n)}`,
      week: (n: number) => `Last week: ${enN(n)}`,
      month: (n: number) => `Last month: ${enN(n)}`,
      custom: (n: number) => `Previous period: ${enN(n)}`,
    },
  },
} satisfies CopySet<typeof uz>;
