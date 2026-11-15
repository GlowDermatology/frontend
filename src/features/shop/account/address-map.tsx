"use client";

import "leaflet/dist/leaflet.css";

import type * as Leaflet from "leaflet";
import { useEffect, useEffectEvent, useId, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  LOCATED_MAP_ZOOM,
  formatPin,
  toPin,
  wrapLongitude,
  type GeoPin,
} from "@/domain/geo-pin";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/i18n/locales";
import { mapTileUrl } from "@/lib/map-tiles";

import { accountCopy } from "../copy/account";

type LeafletModule = typeof Leaflet;

/** Inlined at build; `next.config.ts` lists the same origin in the CSP `img-src`. */
const TILE_URL = mapTileUrl(process.env.NEXT_PUBLIC_MAP_TILE_URL);

/** The tile licence (ODbL) asks for this credit wherever the map is shown. */
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

/** A saved pin opens close enough to see the building. */
const PINNED_ZOOM = 16;

/*
 * The marker is an inline SVG in a divIcon: Leaflet's default icon resolves
 * its PNG from the stylesheet's URL at runtime, which bundlers break.
 */
const PIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42" aria-hidden="true" focusable="false">' +
  '<path d="M16 1C7.7 1 1 7.6 1 15.8 1 27 16 41 16 41s15-14 15-25.2C31 7.6 24.3 1 16 1z" style="fill:var(--gd-gold-ink);stroke:#fff;stroke-width:2"/>' +
  '<circle cx="16" cy="15.5" r="5.5" style="fill:#fff"/></svg>';

const noSubscribe = () => () => {};

type MapStatus = "loading" | "ready" | "failed";
type LocateStatus = "idle" | "locating" | "denied" | "failed";

/**
 * The address's map pin (Yandex Delivery needs the exact point): Leaflet
 * with OpenStreetMap tiles, loaded on the client only. A click or tap sets
 * the pin, the marker can be dragged, the arrow keys pan the focused map and
 * "Xarita markaziga qo‘yish" pins its centre, so the keyboard reaches every
 * point; "Joylashuvimni aniqlash" uses the browser's geolocation when
 * offered.
 */
export function AddressMap({
  locale,
  value,
  onChange,
  error,
  needsPin = false,
}: {
  locale: Locale;
  value: GeoPin | null;
  onChange: (pin: GeoPin | null) => void;
  /** A field message from the Server Action (`latitude`). */
  error?: string;
  /** No BTS regions to choose from: the pin is what makes delivery possible. */
  needsPin?: boolean;
}) {
  const copy = accountCopy[locale].addresses.map;
  const titleId = useId();
  const hintId = useId();
  const statusId = useId();
  const container = useRef<HTMLDivElement>(null);
  const leaflet = useRef<LeafletModule | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const marker = useRef<Leaflet.Marker | null>(null);
  const [status, setStatus] = useState<MapStatus>("loading");
  const [locate, setLocate] = useState<LocateStatus>("idle");
  const canLocate = useSyncExternalStore(
    noSubscribe,
    () => typeof navigator !== "undefined" && "geolocation" in navigator,
    () => false,
  );

  const choose = (latitude: number, longitude: number) => {
    const pin = toPin(latitude, wrapLongitude(longitude));
    if (pin) onChange(pin);
  };
  const onMapPick = useEffectEvent((latlng: Leaflet.LatLng) => choose(latlng.lat, latlng.lng));
  const startView = useEffectEvent(() => ({
    center: value ?? DEFAULT_MAP_CENTER,
    zoom: value ? PINNED_ZOOM : DEFAULT_MAP_ZOOM,
    zoomIn: copy.zoomIn,
    zoomOut: copy.zoomOut,
  }));

  // Create the map once; Leaflet touches `window`, so it is imported here.
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    let cancelled = false;
    let created: Leaflet.Map | null = null;
    let observer: ResizeObserver | null = null;
    import("leaflet")
      .then((module) => {
        if (cancelled) return;
        const L = ((module as { default?: LeafletModule }).default ?? module) as LeafletModule;
        const view = startView();
        created = L.map(node, {
          center: [view.center.latitude, view.center.longitude],
          zoom: view.zoom,
          zoomControl: false,
          keyboard: true,
          worldCopyJump: true,
        });
        L.control.zoom({ zoomInTitle: view.zoomIn, zoomOutTitle: view.zoomOut }).addTo(created);
        created.attributionControl.setPrefix(false);
        L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(created);
        created.on("click", (event: Leaflet.LeafletMouseEvent) => onMapPick(event.latlng));
        // The dialog animates in: measure again once the container has its size.
        observer = new ResizeObserver(() => created?.invalidateSize());
        observer.observe(node);
        leaflet.current = L;
        map.current = created;
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });
    return () => {
      cancelled = true;
      observer?.disconnect();
      created?.remove();
      map.current = null;
      marker.current = null;
    };
  }, []);

  // Keep the marker on the chosen pin (added, moved or removed).
  useEffect(() => {
    const L = leaflet.current;
    const current = map.current;
    if (status !== "ready" || !L || !current) return;
    if (!value) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    const at: Leaflet.LatLngTuple = [value.latitude, value.longitude];
    if (marker.current) {
      marker.current.setLatLng(at);
      return;
    }
    const created = L.marker(at, {
      draggable: true,
      autoPan: true,
      keyboard: true,
      title: copy.marker,
      alt: copy.marker,
      icon: L.divIcon({
        html: PIN_SVG,
        className:
          "rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink",
        iconSize: [32, 42],
        iconAnchor: [16, 41],
      }),
    }).addTo(current);
    created.on("dragend", () => onMapPick(created.getLatLng()));
    marker.current = created;
  }, [status, value, copy.marker]);

  const findMe = () => {
    if (!("geolocation" in navigator)) return;
    setLocate("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocate("idle");
        const pin = toPin(position.coords.latitude, position.coords.longitude);
        if (!pin) return setLocate("failed");
        onChange(pin);
        const current = map.current;
        current?.setView(
          [pin.latitude, pin.longitude],
          Math.max(current.getZoom(), LOCATED_MAP_ZOOM),
        );
      },
      (failure) => setLocate(failure.code === failure.PERMISSION_DENIED ? "denied" : "failed"),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  };

  const pinCentre = () => {
    const centre = map.current?.getCenter();
    if (centre) choose(centre.lat, centre.lng);
  };

  const locateNote =
    locate === "locating"
      ? copy.locating
      : locate === "denied"
        ? copy.locateDenied
        : locate === "failed"
          ? copy.locateFailed
          : null;

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <h3 id={titleId} className="m-0 text-label text-ink">
        {copy.title}
      </h3>
      <p id={hintId} className="m-0 text-caption text-ink-muted">
        {needsPin && !value ? copy.hintNoRegions : copy.hint}
      </p>
      <div
        className={cn(
          "relative isolate h-60 overflow-hidden rounded-md border-[1.5px] bg-image-well sm:h-72",
          error ? "border-danger" : "border-line",
        )}
      >
        <div
          ref={container}
          role="application"
          aria-label={copy.region}
          aria-describedby={`${hintId} ${statusId}`}
          className="size-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-ink"
        />
        {status === "ready" ? (
          // The centre mark for "Xarita markaziga qo‘yish" (above the tiles, below the marker).
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 z-[450] size-5 -translate-1/2 text-ink/70"
          >
            <span className="absolute top-1/2 left-0 h-px w-full bg-current" />
            <span className="absolute top-0 left-1/2 h-full w-px bg-current" />
          </span>
        ) : (
          <p className="absolute inset-0 z-[450] m-0 grid place-items-center p-4 text-center text-body-sm text-ink-muted">
            {status === "loading" ? copy.loading : copy.unavailable}
          </p>
        )}
      </div>
      <p
        id={statusId}
        aria-live="polite"
        className={cn(
          "m-0 flex items-center gap-2 text-body-sm",
          value ? "text-ink" : "text-ink-muted",
        )}
      >
        <Icon
          name="map-pin"
          size={18}
          className={cn("shrink-0", value ? "text-gold-ink" : "text-ink-muted")}
        />
        {value ? (
          <span>
            {copy.chosen}: <span className="font-semibold tabular-nums">{formatPin(value)}</span>
          </span>
        ) : (
          <span>{copy.none}</span>
        )}
      </p>
      {error ? (
        <p role="alert" className="m-0 text-body-sm font-semibold text-danger-strong">
          {error}
        </p>
      ) : null}
      {locateNote ? (
        <p role="status" className="m-0 text-caption text-ink-muted">
          {locateNote}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {canLocate ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={findMe}
            disabled={locate === "locating"}
            aria-busy={locate === "locating" || undefined}
          >
            <Icon name="map-pin" size={16} />
            {copy.locate}
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={pinCentre} disabled={status !== "ready"}>
          <Icon name="plus" size={16} />
          {copy.center}
        </Button>
        {value ? (
          <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
            <Icon name="close" size={16} />
            {copy.clear}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
