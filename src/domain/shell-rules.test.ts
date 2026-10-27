import { describe, expect, it } from "vitest";

import { maskPhone, normalizePhone } from "@/lib/phone";

import {
  bookingProblem,
  canChangeAppointment,
  slotOptions,
  specialistSchedule,
  tashkentMinutes,
  type SpecialistSchedule,
} from "./appointment";
import {
  AUDIT_ACTION_LABELS,
  auditActionLabel,
  auditActionsByGroup,
  auditDataText,
  auditObjectLabel,
} from "./audit";
import { notificationImageProblem, unknownPlaceholders } from "./notification";
import { parseMemberList, segmentRulesSummary } from "./segment";

const NBSP = " ";

describe("booking slots", () => {
  const jasur: SpecialistSchedule = {
    workingHours: { start: "09:00", end: "18:00" },
    blocks: [{ start: "13:00", end: "14:00" }],
    busy: [{ id: "4", from: 9 * 60 + 30, to: 10 * 60 }],
  };

  it("offers the 5-minute grid inside working hours, flagging breaks and held visits", () => {
    const slots = slotOptions(jasur, 30);
    // 09:00–09:30 ends exactly when the held visit starts.
    expect(slots[0]).toEqual({ time: "09:00", taken: false });
    expect(slots.find((s) => s.time === "09:05")).toEqual({ time: "09:05", taken: true });
    expect(slots.find((s) => s.time === "10:00")).toEqual({ time: "10:00", taken: false });
    expect(slots.find((s) => s.time === "12:35")?.taken).toBe(true);
    expect(slots.find((s) => s.time === "14:00")?.taken).toBe(false);
    // The last start still ends by closing time.
    expect(slots.at(-1)?.time).toBe("17:30");
    expect(slots.every((s) => Number(s.time.slice(3)) % 5 === 0)).toBe(true);
  });

  it("starts after `notBefore` (today) and leaves the visit being moved out of the overlap", () => {
    expect(slotOptions(jasur, 30, { notBefore: 15 * 60 + 2 })[0]?.time).toBe("15:05");
    expect(slotOptions(jasur, 30, { excludeId: "4" }).find((s) => s.time === "09:30")?.taken).toBe(
      false,
    );
    expect(slotOptions({ workingHours: null, blocks: [], busy: [] }, 30)).toEqual([]);
  });

  it("answers the backend's start codes for the mock actions", () => {
    expect(bookingProblem(jasur, 10 * 60 + 3, 30)).toBe("invalid_step");
    expect(bookingProblem(jasur, 10 * 60, 30, { inPast: true })).toBe("in_past");
    expect(bookingProblem(jasur, 8 * 60, 30)).toBe("outside_working_hours");
    expect(bookingProblem(jasur, 17 * 60 + 45, 30)).toBe("outside_working_hours");
    expect(bookingProblem(jasur, 13 * 60 + 15, 30)).toBe("slot_unavailable");
    expect(bookingProblem(jasur, 9 * 60 + 45, 30)).toBe("slot_unavailable");
    expect(bookingProblem(jasur, 9 * 60 + 45, 30, { excludeId: "4" })).toBeNull();
    expect(bookingProblem(jasur, 10 * 60, 30)).toBeNull();
    expect(bookingProblem({ workingHours: null, blocks: [], busy: [] }, 600, 30)).toBe(
      "outside_working_hours",
    );
  });

  it("builds a specialist's schedule from a loaded day (only requested/confirmed hold time)", () => {
    const visit = (id: string, status: "requested" | "confirmed" | "cancelled", start: string) => ({
      id,
      specialistId: "2",
      customer: { id: "1", name: "A", phone: "+998900000000" },
      serviceId: "1",
      service: "S",
      durationMin: 30,
      start: `2026-10-26T${start}:00+05:00`,
      end: `2026-10-26T${start.slice(0, 3)}30:00+05:00`,
      price: 1,
      status,
      requestedAt: "2026-10-24T08:00:00+05:00",
      requestedVia: "ilova" as const,
    });
    const schedule = specialistSchedule(
      {
        specialists: [
          {
            id: "2",
            name: "Jasur",
            role: "Dermatolog",
            workingHours: { start: "09:00", end: "18:00" },
            blocks: [{ start: "13:00", end: "14:00", kind: "off", label: "Ish vaqti emas" }],
          },
          {
            id: "3",
            name: "Off",
            role: "Kosmetolog",
            workingHours: { start: "09:00", end: "18:00" },
            blocks: [],
            working: false,
          },
        ],
        appointments: [visit("a", "requested", "09:00"), visit("b", "cancelled", "10:00")],
      },
      "2",
    );
    expect(schedule.busy).toEqual([{ id: "a", from: 540, to: 570 }]);
    expect(schedule.blocks).toHaveLength(1);
    expect(specialistSchedule({ specialists: [], appointments: [] }, "9").workingHours).toBeNull();
    expect(tashkentMinutes("2026-10-26T04:15:00Z")).toBe(9 * 60 + 15);
    expect(canChangeAppointment("confirmed")).toBe(true);
    expect(canChangeAppointment("cancelled")).toBe(false);
  });
});

describe("phone mask", () => {
  it("formats while typing and normalises to E.164", () => {
    expect(maskPhone("90")).toBe("+998 90");
    expect(maskPhone("901234567")).toBe("+998 90 123 45 67");
    expect(maskPhone("+998 90 123 45 6789")).toBe("+998 90 123 45 67");
    expect(maskPhone("")).toBe("");
    expect(normalizePhone("+998 90 123 45 67")).toBe("+998901234567");
    expect(normalizePhone("90 123 45 67")).toBe("+998901234567");
    expect(normalizePhone("+998 90")).toBe("+99890");
  });
});

describe("segments rules summary and member list", () => {
  it("describes the rules in words (AND), or a manual-only group", () => {
    expect(segmentRulesSummary({ minOnlineOrders: 3, minLifetimeAmount: null })).toBe(
      "Kamida 3 ta onlayn buyurtma",
    );
    expect(segmentRulesSummary({ minOnlineOrders: null, minLifetimeAmount: 10_000_000 })).toBe(
      `Jami xaridlar 10${NBSP}mln so‘mdan`,
    );
    expect(segmentRulesSummary({ minOnlineOrders: 5, minLifetimeAmount: 2_500_000 })).toBe(
      `Kamida 5 ta onlayn buyurtma va jami xaridlar 2,5${NBSP}mln so‘mdan`,
    );
    expect(segmentRulesSummary({ minOnlineOrders: null, minLifetimeAmount: 500_000 })).toBe(
      `Jami xaridlar 500${NBSP}000 so‘mdan`,
    );
    expect(segmentRulesSummary({ minOnlineOrders: null, minLifetimeAmount: null })).toBe(
      "Faqat qo‘lda qo‘shilgan mijozlar",
    );
  });

  it("splits ids and phones, de-duplicated, and reports the rest", () => {
    expect(parseMemberList("5, 12\n+998901234567; 998901234567;007\nabc\n+99890")).toEqual({
      ids: ["5", "12", "7"],
      phones: ["+998901234567"],
      invalid: ["abc", "+99890"],
      incomplete: [],
    });
  });

  it("reads a spaced phone as one phone, never as several customer ids", () => {
    expect(parseMemberList("90 123 45 67")).toEqual({
      ids: [],
      phones: ["+998901234567"],
      invalid: [],
      incomplete: [],
    });
    expect(parseMemberList("+998 90 123 45 67, (90) 765-43-21")).toEqual({
      ids: [],
      phones: ["+998901234567", "+998907654321"],
      invalid: [],
      incomplete: [],
    });
  });

  it("rejects spaced digits that are not a whole phone and space-separated ids", () => {
    expect(parseMemberList("90 123 45")).toMatchObject({ ids: [], incomplete: ["90 123 45"] });
    expect(parseMemberList("5 12")).toMatchObject({ ids: [], incomplete: ["5 12"] });
    expect(parseMemberList("12345678")).toMatchObject({ ids: [], invalid: ["12345678"] });
  });
});

describe("audit labels", () => {
  it("labels every §3.2 action incl. the M1d additions; unknown actions stay raw", () => {
    for (const action of [
      "appointment.created",
      "appointment.rescheduled",
      "appointment.cancelled",
      "notification.push_dead",
      "working_hours_override.created",
      "working_hours_override.updated",
      "working_hours_override.deleted",
      "professional_service.deleted",
      "segment.member_removed",
      "export.downloaded",
      // M3
      "notification.cancelled",
      "outbox.requeued",
      "outbox.resolved",
      "outbox.purged",
      "billz.sale_recorded_by_hand",
      "billz.payment_attempt_forgotten",
      "integrations.inbox_purged",
      "report.consistency",
    ]) {
      expect(AUDIT_ACTION_LABELS[action], action).toBeTruthy();
    }
    expect(auditActionLabel("appointment.rescheduled")).toBe("Qabul ko‘chirildi");
    expect(auditActionLabel("working_hours_override.updated")).toBe(
      "Ish vaqti istisnosi o‘zgartirildi",
    );
    expect(auditActionLabel("loyalty.recalculated")).toBe("loyalty.recalculated");
    expect(auditObjectLabel("segment")).toBe("Guruh");
    // Campaign actions are recorded on the `campaign` object type.
    expect(auditObjectLabel("campaign")).toBe("Bildirishnoma");
    // The per-account loyalty rows and the POS devices (backend loyalty/tasks.py, pos views).
    expect(auditObjectLabel("loyalty_account")).toBe("Cashback hisobi");
    expect(auditObjectLabel("pos_device")).toBe("POS qurilmasi");
    expect(auditObjectLabel("mystery")).toBe("mystery");
  });

  it("files every labelled action under exactly one filter group, §3.2's System row first", () => {
    const groups = auditActionsByGroup();
    const groupOf = (action: string) =>
      groups.filter((group) => group.actions.includes(action)).map((group) => group.label);
    for (const action of Object.keys(AUDIT_ACTION_LABELS)) {
      expect(groupOf(action), action).toHaveLength(1);
    }
    // §3.2 lists the M3 Billz repair actions under System, not Catalog.
    expect(groupOf("billz.sale_recorded_by_hand")).toEqual(["Tizim"]);
    expect(groupOf("billz.payment_attempt_forgotten")).toEqual(["Tizim"]);
    expect(groupOf("outbox.resolved")).toEqual(["Tizim"]);
    expect(groupOf("billz.import_started")).toEqual(["Katalog"]);
    expect(groupOf("loyalty.reconciliation_mismatch")).toEqual(["Cashback"]);
  });

  it("prints the payload as indented JSON text", () => {
    expect(auditDataText({ reason: "<b>x</b>", amount: 1 })).toBe(
      '{\n  "reason": "<b>x</b>",\n  "amount": 1\n}',
    );
    expect(auditDataText(null)).toBe("—");
  });
});

describe("notification rules", () => {
  it("finds placeholders other than {raqam} and checks the push image", () => {
    expect(unknownPlaceholders("Buyurtma №{raqam} {ism} {summa}")).toEqual(["{ism}", "{summa}"]);
    expect(unknownPlaceholders("Buyurtma №{raqam}")).toEqual([]);
    expect(notificationImageProblem({ type: "image/webp", size: 10 })).toBeNull();
    expect(notificationImageProblem({ type: "image/gif", size: 10 })).toBe(
      "Faqat JPEG, PNG yoki WebP rasm.",
    );
    expect(notificationImageProblem({ type: "image/png", size: 5 * 1024 * 1024 + 1 })).toBe(
      "Rasm 5 MB dan oshmasin.",
    );
  });
});
