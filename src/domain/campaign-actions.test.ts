import { describe, expect, it } from "vitest";

import { allowedActions, confirmableTests, dispatchEta } from "./campaign-actions";
import type { CampaignTest, NotificationRecord } from "./notification";

const test = (overrides: Partial<CampaignTest> = {}): CampaignTest => ({
  id: "t1",
  revision: 2,
  deviceLabel: "Dilnoza iPhone",
  phone: "+998901234567",
  sentAt: "2026-10-24T12:00:00+05:00",
  sentBy: "Administrator",
  fcmOk: true,
  fcmError: null,
  confirmedAt: null,
  confirmedBy: null,
  ...overrides,
});

type Subject = Pick<
  NotificationRecord,
  "state" | "authorId" | "revision" | "testedRevision" | "startedAt" | "tests"
>;

const record = (overrides: Partial<Subject> = {}): Subject => ({
  state: "draft",
  authorId: "2",
  revision: 2,
  testedRevision: null,
  startedAt: null,
  tests: [],
  ...overrides,
});

const superuser = { id: "1", isSuperuser: true };
const author = { id: "2", isSuperuser: false };
const other = { id: "3", isSuperuser: false };

describe("allowedActions", () => {
  it("lets the author and a superuser edit or delete a draft or tested campaign, nobody else", () => {
    expect(allowedActions(record(), author)).toEqual(["edit", "delete"]);
    expect(allowedActions(record(), other)).toEqual([]);
    expect(allowedActions(record({ state: "tested", testedRevision: 1 }), author)).toEqual([
      "edit",
      "delete",
    ]);
    expect(allowedActions(record({ state: "scheduled" }), author)).toEqual([]);
    expect(allowedActions(record({ state: "sent" }), author)).toEqual([]);
    // A system campaign (no author) belongs to superusers only.
    expect(allowedActions(record({ authorId: null }), other)).toEqual([]);
    expect(allowedActions(record({ authorId: null }), superuser)).toContain("edit");
  });

  it("offers ordinary admins no test, approve, cancel or stop control in any state", () => {
    for (const state of [
      "draft",
      "tested",
      "scheduled",
      "sending",
      "stopping",
      "sent",
      "partially_sent",
      "cancelled",
      "failed",
    ] as const) {
      const actions = allowedActions(record({ state, testedRevision: 2, tests: [test()] }), author);
      expect(actions.filter((a) => a !== "edit" && a !== "delete")).toEqual([]);
    }
  });

  it("superuser: test on a draft or tested campaign, confirm a delivered test of the current revision", () => {
    expect(allowedActions(record(), superuser)).toEqual(["edit", "delete", "test"]);
    expect(allowedActions(record({ tests: [test()] }), superuser)).toEqual([
      "edit",
      "delete",
      "test",
      "confirm",
    ]);
    // A test of an older revision, a refused one or a confirmed one is not confirmable.
    expect(allowedActions(record({ tests: [test({ revision: 1 })] }), superuser)).not.toContain(
      "confirm",
    );
    expect(allowedActions(record({ tests: [test({ fcmOk: false })] }), superuser)).not.toContain(
      "confirm",
    );
    expect(
      allowedActions(
        record({ tests: [test({ confirmedAt: "2026-10-24T12:05:00+05:00" })] }),
        superuser,
      ),
    ).not.toContain("confirm");
  });

  it("superuser: approve only a tested campaign whose confirmation names the current revision", () => {
    expect(allowedActions(record({ state: "tested", testedRevision: 2 }), superuser)).toEqual([
      "edit",
      "delete",
      "test",
      "approve",
    ]);
    expect(allowedActions(record({ state: "tested", testedRevision: 1 }), superuser)).toEqual([
      "edit",
      "delete",
      "test",
    ]);
    expect(allowedActions(record({ state: "draft", testedRevision: 2 }), superuser)).not.toContain(
      "approve",
    );
  });

  it("superuser: cancel or return a waiting campaign, return a cancelled one, stop a sending one", () => {
    expect(allowedActions(record({ state: "scheduled" }), superuser)).toEqual([
      "returnToDraft",
      "cancel",
    ]);
    expect(allowedActions(record({ state: "cancelled" }), superuser)).toEqual(["returnToDraft"]);
    // A stopped send ends as cancelled too, but it started: no way back to draft.
    expect(
      allowedActions(
        record({ state: "cancelled", startedAt: "2026-10-24T12:00:00+05:00" }),
        superuser,
      ),
    ).toEqual([]);
    expect(allowedActions(record({ state: "sending" }), superuser)).toEqual(["stop"]);
    for (const state of ["stopping", "sent", "partially_sent", "failed"] as const) {
      expect(allowedActions(record({ state }), superuser)).toEqual([]);
    }
  });
});

describe("confirmableTests", () => {
  it("keeps the delivered, unconfirmed tests of the current revision", () => {
    const current = test({ id: "a" });
    const tests = [
      current,
      test({ id: "b", revision: 1 }),
      test({ id: "c", fcmOk: null }),
      test({ id: "d", fcmOk: false, fcmError: "unregistered" }),
      test({ id: "e", confirmedAt: "2026-10-24T12:05:00+05:00", confirmedBy: "Administrator" }),
    ];
    expect(confirmableTests({ revision: 2, tests })).toEqual([current]);
    expect(confirmableTests({ revision: 3, tests })).toEqual([]);
  });
});

describe("dispatchEta", () => {
  const now = "2026-10-24T12:00:00+05:00";

  it("is the approval delay after now when nothing later was requested", () => {
    expect(dispatchEta(now, 5, null).toISOString()).toBe("2026-10-24T07:05:00.000Z");
    expect(dispatchEta(new Date(now), 0, undefined).toISOString()).toBe("2026-10-24T07:00:00.000Z");
    expect(dispatchEta(now, 5, "2026-10-24T11:00:00+05:00").toISOString()).toBe(
      "2026-10-24T07:05:00.000Z",
    );
  });

  it("is the requested time when that is later than the delay", () => {
    expect(dispatchEta(now, 5, "2026-10-26T10:00:00+05:00").toISOString()).toBe(
      "2026-10-26T05:00:00.000Z",
    );
    // An unreadable requested time is ignored.
    expect(dispatchEta(now, 5, "soon").toISOString()).toBe("2026-10-24T07:05:00.000Z");
  });
});
