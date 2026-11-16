import { describe, expect, it } from "vitest";

import { DEFAULT_MAP_TILE_URL, mapTileOrigins, mapTileUrl, parseMapTileUrl } from "./map-tiles";

describe("parseMapTileUrl", () => {
  it("defaults to the OpenStreetMap tile server", () => {
    expect(parseMapTileUrl(undefined)).toBe(DEFAULT_MAP_TILE_URL);
    expect(parseMapTileUrl("  ")).toBe(DEFAULT_MAP_TILE_URL);
  });

  it("keeps a valid template", () => {
    const url = "https://{s}.tiles.example.uz/osm/{z}/{x}/{y}{r}.png?key=public";
    expect(parseMapTileUrl(` ${url} `)).toBe(url);
    expect(parseMapTileUrl("http://localhost:8080/{z}/{x}/{y}.png")).toBe(
      "http://localhost:8080/{z}/{x}/{y}.png",
    );
  });

  it.each([
    "tile.openstreetmap.org/{z}/{x}/{y}.png",
    "http://tiles.example.uz/{z}/{x}/{y}.png",
    "https://tiles.example.uz/{z}/{x}.png",
    "https://*.example.uz/{z}/{x}/{y}.png",
    "https://{a}.example.uz/{z}/{x}/{y}.png",
    "https://example.uz",
    "javascript:alert(1)//{z}/{x}/{y}",
  ])("refuses %s", (value) => {
    expect(() => parseMapTileUrl(value)).toThrow(/NEXT_PUBLIC_MAP_TILE_URL/);
    expect(mapTileUrl(value)).toBe(DEFAULT_MAP_TILE_URL);
  });
});

describe("mapTileOrigins", () => {
  it("lists exactly the tile origins", () => {
    expect(mapTileOrigins(undefined)).toEqual(["https://tile.openstreetmap.org"]);
    expect(mapTileOrigins("https://Tiles.Example.uz:8443/{z}/{x}/{y}.png")).toEqual([
      "https://tiles.example.uz:8443",
    ]);
    expect(mapTileOrigins("https://{s}.tile.example.uz/{z}/{x}/{y}.png")).toEqual([
      "https://a.tile.example.uz",
      "https://b.tile.example.uz",
      "https://c.tile.example.uz",
    ]);
  });
});
