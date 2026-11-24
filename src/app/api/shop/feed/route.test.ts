import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  storefrontEnabled: vi.fn(async () => true),
  getFeedPage: vi.fn(),
}));

vi.mock("@/data/shop/mode", () => ({ storefrontEnabled: mocks.storefrontEnabled }));
vi.mock("@/data/shop/live", async () => {
  const actual = await vi.importActual<typeof import("@/data/shop/live")>("@/data/shop/live");
  return { feedCategoryOf: actual.feedCategoryOf, getFeedPage: mocks.getFeedPage };
});

const { GET } = await import("./route");

const request = (query: string) => new NextRequest(`http://localhost:3000/api/shop/feed${query}`);

describe("GET /api/shop/feed", () => {
  beforeEach(() => {
    mocks.storefrontEnabled.mockResolvedValue(true);
    mocks.getFeedPage.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("answers a page from the cached reader, cacheable", async () => {
    mocks.getFeedPage.mockResolvedValue({ items: [{ id: 1 }], nextCursor: "c2" });
    const response = await GET(request("?locale=ru&cursor=c1&category=serums"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [{ id: 1 }], nextCursor: "c2" });
    expect(mocks.getFeedPage).toHaveBeenCalledWith("ru", "c1", "serums");
    expect(response.headers.get("cache-control")).toContain("s-maxage=30");
  });

  it("refuses malformed parameters without calling the API", async () => {
    for (const query of ["?locale=de", "?cursor=../x", "?category=Serums!"]) {
      const response = await GET(request(query));
      expect(response.status).toBe(400);
    }
    expect(mocks.getFeedPage).not.toHaveBeenCalled();
  });

  it("is absent in mock mode and when the backend has no feed", async () => {
    mocks.storefrontEnabled.mockResolvedValueOnce(false);
    expect((await GET(request(""))).status).toBe(404);
    mocks.getFeedPage.mockResolvedValue(null);
    expect((await GET(request(""))).status).toBe(404);
  });

  it("answers 503 when the API fails", async () => {
    mocks.getFeedPage.mockRejectedValue(new Error("down"));
    const response = await GET(request("?locale=uz"));
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
