"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { DELIVERY_REFRESH_MS, refreshDue } from "@/domain/shop-delivery";

/**
 * Keeps the order page current while a Yandex parcel is on its way: the
 * server render is refreshed every 30 s (`router.refresh()`, which keeps the
 * page's client state) while the tab is visible, and once more when the tab
 * comes back after a missed beat. `active` comes from the server render
 * (`shouldRefreshDelivery`), so a refresh that shows the parcel delivered,
 * cancelled or returned stops the polling by itself.
 */
export function DeliveryRefresh({ active, label }: { active: boolean; label: string }) {
  const router = useRouter();
  const lastRefresh = useRef(0);

  useEffect(() => {
    if (!active) return;
    lastRefresh.current = Date.now();
    const refresh = () => {
      lastRefresh.current = Date.now();
      router.refresh();
    };
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, DELIVERY_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible" && refreshDue(lastRefresh.current, Date.now())) {
        refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, router]);

  if (!active) return null;
  return (
    <p className="m-0 flex items-center gap-2 text-caption text-ink-muted">
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-gold motion-safe:animate-pulse"
      />
      {label}
    </p>
  );
}
