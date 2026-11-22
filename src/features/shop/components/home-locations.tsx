"use client";

import "leaflet/dist/leaflet.css";

import type * as Leaflet from "leaflet";
import type { Route } from "next";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { homeActionStyles } from "@/components/brand/home-actions";
import { Icon } from "@/components/ui/icon";
import type { GeoPin } from "@/domain/geo-pin";
import { cn } from "@/lib/cn";
import { mapTileUrl } from "@/lib/map-tiles";

type MapCopy = {
  label: string;
  loading: string;
  unavailable: string;
  directions: string;
  zoomIn: string;
  zoomOut: string;
};

export type VisitLocation = {
  id: string;
  name: string;
  address: string;
  directions?: string;
  pin: GeoPin | null;
  primary?: boolean;
  bookingHref?: Route;
  bookingLabel?: string;
};

const tileUrl = mapTileUrl(process.env.NEXT_PUBLIC_MAP_TILE_URL);
const attribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function coordinates(pin: GeoPin): Leaflet.LatLngTuple {
  return [pin.latitude, pin.longitude];
}

export function HomeLocations({ locations, copy }: { locations: VisitLocation[]; copy: MapCopy }) {
  const first = locations.find((location) => location.pin)?.id ?? null;
  const [selected, setSelected] = useState(first);
  const [nearViewport, setNearViewport] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const markers = useRef(new Map<string, Leaflet.Marker>());

  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const select = useCallback((location: VisitLocation) => {
    setNearViewport(true);
    setSelected(location.id);
    if (location.pin) {
      map.current?.panInside(coordinates(location.pin), { padding: [48, 48], animate: false });
    }
  }, []);

  useEffect(() => {
    const node = container.current;
    if (!nearViewport || !node) return;
    let cancelled = false;
    let created: Leaflet.Map | null = null;
    let resize: ResizeObserver | null = null;
    const activeMarkers = markers.current;
    void import("leaflet")
      .then((module) => {
        if (cancelled) return;
        const L = (module as { default?: typeof Leaflet }).default ?? module;
        const pins = locations.flatMap((location) =>
          location.pin ? [{ location, position: coordinates(location.pin) }] : [],
        );
        const start = pins[0]?.position;
        if (!start) return;

        const view = L.map(node, {
          center: start,
          zoom: 15,
          zoomControl: false,
          scrollWheelZoom: false,
          worldCopyJump: true,
        });
        created = view;
        map.current = view;
        view.attributionControl.setPrefix(false);
        L.control.zoom({ zoomInTitle: copy.zoomIn, zoomOutTitle: copy.zoomOut }).addTo(view);

        for (const { location, position } of pins) {
          const size = location.primary ? 30 : 24;
          const marker = L.marker(position, {
            title: location.name,
            alt: location.name,
            zIndexOffset: location.primary ? 300 : 0,
            icon: L.divIcon({
              className: cn(
                "shadow-md rounded-full border-2 border-white",
                location.primary ? "bg-gold-ink" : "bg-nav",
              ),
              iconSize: [size, size],
            }),
          }).addTo(view);
          marker.getElement()?.setAttribute("aria-label", location.name);
          marker.on("click", () => select(location));
          activeMarkers.set(location.id, marker);
        }

        if (pins.length > 1) {
          view.fitBounds(L.latLngBounds(pins.map(({ position }) => position)), {
            padding: [40, 40],
            maxZoom: 15,
          });
        }

        let loadedTile = false;
        const layer = L.tileLayer(tileUrl, { maxZoom: 19, attribution });
        layer.on("tileload", () => {
          loadedTile = true;
          setStatus("ready");
        });
        layer.on("load", () => {
          if (!loadedTile) setStatus("failed");
        });
        layer.addTo(view);
        resize = new ResizeObserver(() => view.invalidateSize({ pan: false }));
        resize.observe(node);
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });

    return () => {
      cancelled = true;
      resize?.disconnect();
      created?.remove();
      map.current = null;
      activeMarkers.clear();
    };
  }, [copy.zoomIn, copy.zoomOut, locations, nearViewport, select]);

  useEffect(() => {
    for (const [id, marker] of markers.current) {
      const element = marker.getElement();
      element?.setAttribute("aria-pressed", String(id === selected));
      element?.classList.toggle("ring-4", id === selected);
      element?.classList.toggle("ring-gold", id === selected);
    }
  }, [selected, status]);

  return (
    <div className={cn("grid gap-6", first && "lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]")}>
      <ul className={cn("m-0 grid list-none content-start gap-3 p-0", !first && "sm:grid-cols-2")}>
        {locations.map((location) => {
          const { pin } = location;
          const address = location.address;
          const directionsUrl =
            pin || address
              ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pin ? coordinates(pin).join(",") : address)}`
              : null;
          return (
            <li
              key={location.id}
              className={cn(
                "rounded-[16px] border bg-surface-raised px-4 py-3.5",
                pin && selected === location.id ? "border-gold" : "border-line",
              )}
            >
              <div className="flex flex-col gap-1">
                {pin ? (
                  <button
                    type="button"
                    aria-pressed={selected === location.id}
                    onClick={() => select(location)}
                    className="flex min-h-11 w-fit cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left font-bold text-ink hover:text-gold-ink"
                  >
                    <Icon
                      name={location.primary ? "bag" : "map-pin"}
                      size={18}
                      className="shrink-0 text-gold-ink"
                    />
                    {location.name}
                  </button>
                ) : (
                  <p className="m-0 font-bold text-ink">{location.name}</p>
                )}
                {address ? <p className="m-0 text-body text-ink-muted">{address}</p> : null}
                {location.directions ? (
                  <p className="m-0 text-body-sm text-ink-muted">{location.directions}</p>
                ) : null}
              </div>
              {directionsUrl || location.bookingHref ? (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {directionsUrl ? (
                    <a
                      href={directionsUrl}
                      className="inline-flex min-h-11 items-center text-body-sm font-bold text-ink underline decoration-gold underline-offset-4"
                    >
                      {copy.directions}
                    </a>
                  ) : null}
                  {location.bookingHref ? (
                    <Link
                      href={location.bookingHref}
                      className={homeActionStyles({ compact: true, secondary: true })}
                    >
                      {location.bookingLabel}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {first ? (
        <div
          data-theme="light"
          className="relative isolate h-[clamp(320px,38vw,480px)] overflow-hidden rounded-[18px] border border-line bg-image-well lg:sticky lg:top-24"
          role="region"
          aria-label={copy.label}
        >
          <div ref={container} className="size-full" />
          {status !== "ready" ? (
            <p
              role="status"
              className="absolute inset-0 z-[500] m-0 grid place-items-center bg-image-well p-4 text-center text-body text-ink"
            >
              {status === "failed" ? copy.unavailable : copy.loading}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
