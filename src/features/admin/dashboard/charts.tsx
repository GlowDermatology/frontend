"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import type { SeriesPoint } from "@/domain/dashboard";
import { cn } from "@/lib/cn";
import { formatMillions, formatNumber } from "@/lib/format";

/** Round an axis maximum up to a "nice" value (1, 1.2, 1.5, 2, 2.5 … × 10ⁿ). */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const power = Math.pow(10, Math.floor(Math.log10(value)));
  for (const step of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (step * power >= value) return step * power;
  }
  return 10 * power;
}

interface DashboardChartsProps {
  series: SeriesPoint[];
  axisNote: string;
  axisLabels: [string, string, string];
}

export function DashboardCharts({ series, axisNote, axisLabels }: DashboardChartsProps) {
  // One hover index for both charts: inspecting a day shows revenue and orders together.
  const [active, setActive] = useState<number | null>(null);

  const revenueMax = niceMax(Math.max(...series.map((p) => p.revenue)));
  const ordersPeak = Math.max(...series.map((p) => p.orders));
  const ordersStep = ordersPeak < 10 ? 2 : 10;
  const ordersMax = Math.max(ordersStep, Math.ceil(ordersPeak / ordersStep) * ordersStep);
  const n = series.length;
  const linePoints = series
    .map(
      (p, i) =>
        `${(((i + 0.5) / n) * 1000).toFixed(1)},${(220 - (p.orders / ordersMax) * 220).toFixed(1)}`,
    )
    .join(" ");

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] gap-4">
      <ChartCard
        id="rev-title"
        title="Tushum, so‘m"
        axisNote={axisNote}
        axisLabels={axisLabels}
        yLabels={[formatMillions(revenueMax), formatMillions(revenueMax / 2)]}
      >
        <PointStrip
          label="Tushum, so‘m"
          series={series}
          active={active}
          onActive={setActive}
          describe={(p) => `${p.label}: ${formatNumber(p.revenue)} so‘m`}
          className="gap-0.5"
          renderPoint={(p, on) => {
            const height = `${((p.revenue / revenueMax) * 100).toFixed(2)}%`;
            return (
              <>
                <span
                  className={cn(
                    "w-[72%] max-w-8 rounded-t-[4px] transition-colors duration-150",
                    on ? "bg-gold-ink" : "bg-gold",
                  )}
                  style={{ height }}
                />
                {on && (
                  <Tooltip
                    label={p.label}
                    value={`${formatNumber(p.revenue)} so‘m`}
                    bottom={`calc(${height} + 8px)`}
                  />
                )}
              </>
            );
          }}
        />
      </ChartCard>

      <ChartCard
        id="ord-title"
        title="Buyurtmalar soni"
        axisNote={axisNote}
        axisLabels={axisLabels}
        yLabels={[String(ordersMax), String(ordersMax / 2)]}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 1000 220"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
        >
          <polyline
            points={linePoints}
            fill="none"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className="stroke-gold-ink"
          />
        </svg>
        <PointStrip
          label="Buyurtmalar soni"
          series={series}
          active={active}
          onActive={setActive}
          describe={(p) => `${p.label}: ${p.orders} ta buyurtma`}
          className="absolute inset-0"
          renderPoint={(p, on) => {
            if (!on) return null;
            const height = `${((p.orders / ordersMax) * 100).toFixed(2)}%`;
            return (
              <>
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-1/2 w-px bg-line-strong opacity-50"
                />
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 -mb-[5px] -ml-[5px] size-2.5 rounded-full bg-gold-ink shadow-[0_0_0_2px_var(--gd-surface-raised)]"
                  style={{ bottom: height }}
                />
                <Tooltip
                  label={p.label}
                  value={`${p.orders} ta buyurtma`}
                  bottom={`calc(${height} + 14px)`}
                />
              </>
            );
          }}
        />
      </ChartCard>
    </div>
  );
}

function ChartCard({
  id,
  title,
  axisNote,
  axisLabels,
  yLabels,
  children,
}: {
  id: string;
  title: string;
  axisNote: string;
  axisLabels: [string, string, string];
  yLabels: [string, string];
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-lg bg-surface-raised p-5 shadow-sm"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="m-0 text-[16px] leading-[22px] font-bold text-ink">
          {title}
        </h2>
        <span className="text-caption font-normal text-ink-muted">{axisNote}</span>
      </div>
      <div className="relative h-[220px] pl-[52px]">
        <div aria-hidden="true" className="absolute top-0 right-0 left-[52px] h-px bg-line" />
        <div aria-hidden="true" className="absolute top-1/2 right-0 left-[52px] h-px bg-line" />
        <span
          aria-hidden="true"
          className="absolute -top-2 left-0 text-[11px] leading-4 text-ink-muted tabular-nums"
        >
          {yLabels[0]}
        </span>
        <span
          aria-hidden="true"
          className="absolute top-[calc(50%-8px)] left-0 text-[11px] leading-4 text-ink-muted tabular-nums"
        >
          {yLabels[1]}
        </span>
        <span
          aria-hidden="true"
          className="absolute -bottom-2 left-0 text-[11px] leading-4 text-ink-muted tabular-nums"
        >
          0
        </span>
        <div className="relative h-full border-b border-line-strong">{children}</div>
      </div>
      <div
        aria-hidden="true"
        className="flex justify-between pl-[52px] text-[11px] leading-4 text-ink-muted tabular-nums"
      >
        <span>{axisLabels[0]}</span>
        <span>{axisLabels[1]}</span>
        <span>{axisLabels[2]}</span>
      </div>
    </section>
  );
}

interface PointStripProps {
  label: string;
  series: SeriesPoint[];
  active: number | null;
  onActive: (index: number | null) => void;
  describe: (point: SeriesPoint) => string;
  renderPoint: (point: SeriesPoint, active: boolean) => ReactNode;
  className?: string;
}

/**
 * One focusable column per data point with a roving tab index: the chart is a
 * single tab stop and arrow keys move between points, each announced by its
 * label (the canvas made every bar a separate tab stop).
 */
function PointStrip({
  label,
  series,
  active,
  onActive,
  describe,
  renderPoint,
  className,
}: PointStripProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const [focusIndex, setFocusIndex] = useState(0);

  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = series.length - 1;
    const next =
      event.key === "ArrowRight"
        ? Math.min(last, index + 1)
        : event.key === "ArrowLeft"
          ? Math.max(0, index - 1)
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    setFocusIndex(next);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="group"
      aria-label={`${label} — strelkalar bilan ko‘ring`}
      className={cn("flex h-full items-stretch", className)}
    >
      {series.map((point, index) => (
        <button
          key={point.label}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="button"
          tabIndex={index === focusIndex ? 0 : -1}
          aria-label={describe(point)}
          onMouseEnter={() => onActive(index)}
          onMouseLeave={() => onActive(null)}
          onFocus={() => {
            setFocusIndex(index);
            onActive(index);
          }}
          onBlur={() => onActive(null)}
          onKeyDown={(event) => move(event, index)}
          className="relative flex min-w-0 flex-1 cursor-default items-end justify-center p-0 focus-visible:outline-offset-0"
        >
          {renderPoint(point, active === index)}
        </button>
      ))}
    </div>
  );
}

function Tooltip({ label, value, bottom }: { label: string; value: string; bottom: string }) {
  return (
    <span
      className="absolute left-1/2 z-[2] flex -translate-x-1/2 animate-fade-in flex-col gap-0.5 rounded-md bg-surface-raised px-2.5 py-2 text-left whitespace-nowrap tabular-nums shadow-lg"
      style={{ bottom }}
    >
      <span className="text-[11px] leading-[14px] text-ink-muted">{label}</span>
      <span className="text-[13px] leading-[18px] font-bold text-ink">{value}</span>
    </span>
  );
}
