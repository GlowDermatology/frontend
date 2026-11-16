import { describe, expect, it } from "vitest";

import { hasIssueFilters, issueListHref, ISSUES_PATH, parseIssueQuery } from "./query";

const params = (href: string) => Object.fromEntries(new URL(href, "http://x").searchParams);

describe("parseIssueQuery / issueListHref", () => {
  it("defaults to the open issues, 20 rows, at the bot's path", () => {
    const query = parseIssueQuery({});
    expect(query).toEqual({
      state: "open",
      urgent: undefined,
      kind: undefined,
      order: undefined,
      page: 1,
      pageSize: 20,
    });
    expect(issueListHref(query)).toBe("/admin/delivery-issues");
    expect(ISSUES_PATH).toBe("/admin/delivery-issues");
    expect(hasIssueFilters(query)).toBe(false);
  });

  it("round-trips every filter, including urgent=0", () => {
    const href =
      "/admin/delivery-issues?state=resolved&urgent=0&kind=incident&order=10240&page=2&size=50";
    const query = parseIssueQuery(params(href));
    expect(query).toEqual({
      state: "resolved",
      urgent: false,
      kind: "incident",
      order: 10240,
      page: 2,
      pageSize: 50,
    });
    expect(issueListHref(query)).toBe(href);
    expect(parseIssueQuery(params(issueListHref({ ...query, urgent: true }))).urgent).toBe(true);
    expect(hasIssueFilters(query)).toBe(true);
  });

  it("drops malformed values", () => {
    expect(
      parseIssueQuery({ state: "maybe", urgent: "yes", kind: "drone", order: "-3", size: "30" }),
    ).toEqual({
      state: "open",
      urgent: undefined,
      kind: undefined,
      order: undefined,
      page: 1,
      pageSize: 20,
    });
    expect(parseIssueQuery({ order: "1234567890123" }).order).toBeUndefined();
    expect(parseIssueQuery({ order: ["7", "8"] }).order).toBe(7);
  });
});
