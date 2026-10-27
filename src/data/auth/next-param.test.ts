import { describe, expect, it } from "vitest";

import { safeNext } from "./next-param";

describe("safeNext", () => {
  it("accepts relative admin paths with queries", () => {
    expect(safeNext("/admin")).toBe("/admin");
    expect(safeNext("/admin/orders")).toBe("/admin/orders");
    expect(safeNext("/admin/orders?status=processing&page=2")).toBe(
      "/admin/orders?status=processing&page=2",
    );
    expect(safeNext("/admin/orders/10248")).toBe("/admin/orders/10248");
    expect(safeNext(["/admin/products", "/x"])).toBe("/admin/products");
  });

  it("falls back to /admin for anything else", () => {
    expect(safeNext(undefined)).toBe("/admin");
    expect(safeNext(null)).toBe("/admin");
    expect(safeNext("")).toBe("/admin");
    expect(safeNext(42)).toBe("/admin");
    expect(safeNext("/")).toBe("/admin");
    expect(safeNext("/ru")).toBe("/admin");
    expect(safeNext("admin")).toBe("/admin");
    expect(safeNext("/adminx")).toBe("/admin");
    expect(safeNext("/administrator")).toBe("/admin");
    expect(safeNext("//evil")).toBe("/admin");
    expect(safeNext("//evil.example/admin")).toBe("/admin");
    expect(safeNext("/\\evil.example")).toBe("/admin");
    expect(safeNext("https://evil.example/admin")).toBe("/admin");
    expect(safeNext("javascript:alert(1)")).toBe("/admin");
    expect(safeNext("/admin\\x")).toBe("/admin");
    expect(safeNext("/admin/x\r\nSet-Cookie: a=b")).toBe("/admin");
    expect(safeNext("/admin/x\n")).toBe("/admin");
    expect(safeNext("/admin/../x")).toBe("/admin");
    expect(safeNext("/admin/./x")).toBe("/admin");
    expect(safeNext("/admin/%2e%2e/x")).toBe("/admin");
    expect(safeNext("/admin/%2E%2e/x")).toBe("/admin");
    expect(safeNext("/admin/" + "a".repeat(3000))).toBe("/admin");
  });

  it("never points back at the login or auth routes", () => {
    expect(safeNext("/admin/login")).toBe("/admin");
    expect(safeNext("/admin/login?next=/admin/orders")).toBe("/admin");
    expect(safeNext("/admin/auth/refresh?next=/admin")).toBe("/admin");
    expect(safeNext("/admin/auth")).toBe("/admin");
  });

  it("drops fragments", () => {
    expect(safeNext("/admin/orders#row")).toBe("/admin/orders");
    expect(safeNext("/admin/orders?page=2#row")).toBe("/admin/orders?page=2");
  });
});

describe("safeNext and the Location header", () => {
  it("percent-encodes characters outside printable ASCII so a redirect never throws", () => {
    expect(safeNext("/admin/€")).toBe("/admin/%E2%82%AC");
    expect(safeNext("/admin/ x")).toBe("/admin/%E2%80%A8x");
    expect(safeNext("/admin/products?q=Ali Valiyev")).toBe("/admin/products?q=Ali%20Valiyev");
    expect(safeNext("/admin/orders?q=крем")).toBe("/admin/orders?q=%D0%BA%D1%80%D0%B5%D0%BC");
    expect(safeNext('/admin/products?q="krem"')).toBe("/admin/products?q=%22krem%22");
    for (const value of ["/admin/€", "/admin/ x", "/admin/x?q=\u{1F600}"]) {
      expect(() => new Headers({ Location: safeNext(value) })).not.toThrow();
    }
  });

  it("refuses C1 controls, lone surrogates and values that grow too long once encoded", () => {
    expect(safeNext("/admin/x\u0085")).toBe("/admin");
    expect(safeNext("/admin/\ud800")).toBe("/admin");
    expect(safeNext("/admin/" + "€".repeat(700))).toBe("/admin");
  });

  it("keeps an encoded login route out (no loop)", () => {
    expect(safeNext("/admin/auth/€")).toBe("/admin");
  });
});
