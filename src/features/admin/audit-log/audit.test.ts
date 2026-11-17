import { createElement, type FC, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { auditFilterParams, mapAuditFacets } from "@/data/api/mappers/audit";
import { filterAudit } from "@/data/mock/audit.queries";
import {
  auditActionLabel,
  auditActionVisible,
  auditActorLabel,
  auditObjectLabel,
  auditObjectVisible,
  auditRequestIdProblem,
  fullAuditFacets,
  knownAuditPrefixes,
  parseAuditRequestId,
  visibleAuditActionGroups,
  visibleAuditObjectGroups,
  type AuditEntry,
  type AuditFacets,
} from "@/domain/audit";
import { AdminLocaleProvider } from "@/lib/i18n/admin-context";
import type { Locale } from "@/lib/i18n/locales";

import { AuditTable } from "./audit-table";
import { auditLogCopy } from "./copy";
import { auditActionOptions, auditActorOptions, auditObjectOptions } from "./options";
import {
  auditHref,
  auditQuery,
  auditRequestHref,
  hasAuditFilters,
  parseAuditFilters,
} from "./query";

const LocaleProvider = AdminLocaleProvider as FC<{ locale: Locale; children?: ReactNode }>;

/** The ordinary staff member's facets, as `GET audit-log/facets/` sends them. */
const STAFF: AuditFacets = {
  tier: "staff",
  ipVisible: false,
  visiblePrefixes: [
    "appointment",
    "auth",
    "banner",
    "billz",
    "cashback",
    "category",
    "customer",
    "export",
    "loyalty",
    "notification",
    "order",
    "product",
    "refund",
    "segment",
    "settings",
  ],
  ownOnlyPrefixes: ["auth", "export"],
  hiddenActions: [
    "billz.payment_attempt_forgotten",
    "billz.sale_recorded_by_hand",
    "loyalty.reconciliation_completed",
    "loyalty.reconciliation_mismatch",
  ],
};

const REQUEST = "7c1f0e2a-4b5d-4e8f-9a6b-3c2d1e0f9a8b";

describe("audit facets (DESIGN §D)", () => {
  it("maps the API facets", () => {
    expect(
      mapAuditFacets({
        tier: "manager",
        ip_visible: true,
        visible_prefixes: ["order", "staff"],
        own_only_prefixes: [],
        hidden_actions: ["billz.sale_recorded_by_hand"],
      }),
    ).toEqual({
      tier: "manager",
      ipVisible: true,
      visiblePrefixes: ["order", "staff"],
      ownOnlyPrefixes: [],
      hiddenActions: ["billz.sale_recorded_by_hand"],
    });
  });

  it("offers ordinary staff no system or staff-admin actions, and no hidden repair actions", () => {
    expect(auditActionVisible("order.cancelled", STAFF)).toBe(true);
    expect(auditActionVisible("auth.login_succeeded", STAFF)).toBe(true);
    expect(auditActionVisible("staff.created", STAFF)).toBe(false);
    expect(auditActionVisible("console.login_succeeded", STAFF)).toBe(false);
    expect(auditActionVisible("billz.sale_recorded_by_hand", STAFF)).toBe(false);
    expect(auditActionVisible("billz.import_started", STAFF)).toBe(true);
    const groups = visibleAuditActionGroups(STAFF).map((group) => group.key);
    expect(groups).not.toContain("system");
    expect(groups).not.toContain("staff");
    expect(groups).toContain("orders");
  });

  it("offers object types by the prefixes that write them", () => {
    expect(auditObjectVisible("order", STAFF)).toBe(true);
    expect(auditObjectVisible("staff", STAFF)).toBe(true); // auth.* rows name staff
    expect(auditObjectVisible("outbox", STAFF)).toBe(false);
    expect(auditObjectVisible("pos_device", STAFF)).toBe(false);
    expect(auditObjectVisible("orders", STAFF)).toBe(true); // export.downloaded
    const keys = visibleAuditObjectGroups(STAFF).map((group) => group.key);
    expect(keys).not.toContain("system");
  });

  it("the superuser (mock mode) sees every known prefix with IPs", () => {
    const full = fullAuditFacets();
    expect(full).toMatchObject({ tier: "superuser", ipVisible: true, hiddenActions: [] });
    expect(full.visiblePrefixes).toEqual(knownAuditPrefixes());
    expect(full.visiblePrefixes).toEqual(expect.arrayContaining(["console", "staff", "outbox"]));
    expect(visibleAuditActionGroups(full).map((group) => group.key)).toContain("system");
  });
});

describe("audit labels in three languages", () => {
  it("labels actions, objects and the system actor; unknown codes stay raw", () => {
    expect(auditActionLabel("order.cancelled")).toBe("Buyurtma bekor qilindi");
    expect(auditActionLabel("order.cancelled", "ru")).toMatch(/[Ѐ-ӿ]/);
    expect(auditActionLabel("order.cancelled", "en")).toBe("Order cancelled");
    expect(auditActionLabel("future.thing", "ru")).toBe("future.thing");
    expect(auditObjectLabel("segment", "en")).toBe("Group");
    expect(auditObjectLabel("mystery", "en")).toBe("mystery");
    expect(auditActorLabel(null, "en")).toBe("System");
    expect(auditActorLabel("Administrator", "ru")).toBe("Administrator");
  });

  it("builds grouped, searchable options with the code as the second line", () => {
    const items = auditActionOptions(STAFF, "en", "All");
    expect(items[0]).toEqual({ value: "", label: "All", text: "All" });
    const orders = items.find((item) => "options" in item && item.label === "Orders");
    expect(orders && "options" in orders && orders.options[0]).toMatchObject({
      description: expect.stringMatching(/^(order|refund|payment|delivery)\./),
    });
    // An action from an old link stays selectable as its raw code.
    const stale = auditActionOptions(STAFF, "uz", "Hammasi", "console.logout");
    expect(stale[1]).toEqual({
      value: "console.logout",
      label: auditActionLabel("console.logout"),
      text: "console.logout",
    });
    const objects = auditObjectOptions(STAFF, "ru", "Все", "outbox");
    expect(objects[1]).toMatchObject({ value: "outbox", text: "outbox" });
    expect(auditActorOptions([{ id: "1", name: "Ali (siz)" }], "Hammasi")).toEqual([
      { value: "", label: "Hammasi" },
      { value: "1", label: "Ali (siz)" },
    ]);
  });

  it("counts entries in each language", () => {
    expect(auditLogCopy.uz.entries(3)).toBe("3 ta yozuv");
    expect(auditLogCopy.ru.entries(22)).toBe("22 записи");
    expect(auditLogCopy.en.entries(1)).toBe("1 entry");
  });
});

describe("request id filter", () => {
  it("accepts 8–64 of [A-Za-z0-9-], trimmed, and says what is wrong otherwise", () => {
    expect(parseAuditRequestId(` ${REQUEST} `)).toBe(REQUEST);
    expect(parseAuditRequestId("7c1f0e2a")).toBe("7c1f0e2a");
    expect(parseAuditRequestId("7c1f0e2")).toBeUndefined();
    expect(parseAuditRequestId("7c1f 0e2a")).toBeUndefined();
    expect(parseAuditRequestId("x".repeat(65))).toBeUndefined();
    expect(auditRequestIdProblem("")).toBeNull();
    expect(auditRequestIdProblem("abc")).toBe("short");
    expect(auditRequestIdProblem("abc_defgh")).toBe("chars");
    expect(auditRequestIdProblem(REQUEST)).toBeNull();
  });

  it("round-trips through the URL and the API params", () => {
    const filters = parseAuditFilters({ request_id: REQUEST, action: "staff.created", page: "2" });
    expect(filters.requestId).toBe(REQUEST);
    expect(auditQuery(filters)).toContain(`request_id=${REQUEST}`);
    expect(auditFilterParams(filters).request_id).toBe(REQUEST);
    expect(parseAuditFilters({ request_id: "short" }).requestId).toBeUndefined();
    expect(hasAuditFilters(parseAuditFilters({}))).toBe(false);
    expect(hasAuditFilters(parseAuditFilters({ request_id: REQUEST }))).toBe(true);
    // The "same request" link drops every other filter and the page, keeps the ordering.
    expect(auditRequestHref({ ordering: "at" }, REQUEST)).toBe(
      auditHref({ ordering: "at", page: 1, requestId: REQUEST }),
    );
    expect(auditRequestHref({ ordering: "-at" }, REQUEST)).toBe(
      `/admin/audit-log?request_id=${REQUEST}`,
    );
  });

  it("mock: matches a request id prefix, never the empty id", () => {
    const rows = filterAudit({ ordering: "-at", page: 1, requestId: "7c1f0e2a" });
    expect(rows.map((row) => row.action).sort()).toEqual([
      "staff.created",
      "staff.password_link_sent",
    ]);
    expect(filterAudit({ ordering: "-at", page: 1, requestId: "zzzzzzzz" })).toEqual([]);
  });
});

describe("AuditTable markup", () => {
  const entry: AuditEntry = {
    id: "9013",
    at: "2026-10-24T07:10:00Z",
    actor: "Administrator",
    actorId: "1",
    action: "staff.created",
    objectType: "staff",
    objectId: "4",
    data: { email: "dilnoza@glowderma.uz" },
    ip: "203.0.113.7",
    requestId: REQUEST,
  };
  const render = (ipVisible: boolean, locale: Locale = "uz", requestId?: string) =>
    renderToStaticMarkup(
      createElement(
        LocaleProvider,
        { locale },
        createElement(AuditTable, {
          entries: [entry, { ...entry, id: "9001", requestId: "", actor: null }],
          sortHref: "/admin/audit-log?ordering=at",
          ascending: false,
          ipVisible,
          filters: { ordering: "-at", page: 1, requestId },
        }),
      ),
    );

  it("shows the whole request id with a copy button and a link to its entries", () => {
    const html = render(true);
    expect(html).toContain("<code data-request-id");
    expect(html).toContain(`>${REQUEST}</code>`);
    expect(html).toContain('aria-label="So‘rov ID ni nusxalash"');
    expect(html).toContain(`href="/admin/audit-log?request_id=${REQUEST}"`);
    expect(html).toContain("203.0.113.7");
    expect(html).toContain(">IP<");
  });

  it("hides the IP column when the viewer may not see IPs, and speaks the admin language", () => {
    const html = render(false, "en");
    expect(html).not.toContain(">IP<");
    expect(html).not.toContain("203.0.113.7");
    expect(html).toContain("Request ID");
    expect(html).toContain("System");
    expect(html).toContain(`aria-label="All entries of request ${REQUEST}"`);
  });

  it("drops the link on the rows of the request already filtered by", () => {
    const html = render(true, "uz", REQUEST);
    expect(html).not.toContain(`href="/admin/audit-log?request_id=${REQUEST}"`);
  });
});
