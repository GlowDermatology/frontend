import { describe, expect, it } from "vitest";

import {
  addDays,
  addMonths,
  addYears,
  clampIso,
  dayNumber,
  daysInMonth,
  diffDays,
  endOfMonth,
  endOfWeek,
  formatDisplayDate,
  formatDisplayDateTime,
  fromDayNumber,
  fromLocalInput,
  isIsoDate,
  isIsoDateTime,
  isIsoTime,
  isLeapYear,
  isWithin,
  joinDateTime,
  maskDateDraft,
  maskDateTimeDraft,
  maskTimeDraft,
  minuteSteps,
  minutesToTime,
  monthGrid,
  parseDisplayDate,
  parseDisplayDateTime,
  parseDisplayTime,
  parseIsoDate,
  splitDateTime,
  startOfMonth,
  startOfWeek,
  tashkentNow,
  tashkentToday,
  timeToMinutes,
  toLocalInput,
  weekdayOf,
} from "./datetime";

/** Feeds a mask one key at a time, the way an input's onChange sees it. */
function typeInto(mask: (previous: string, next: string) => string, keys: string): string[] {
  const seen: string[] = [];
  let value = "";
  for (const key of keys) {
    value = mask(value, value + key);
    seen.push(value);
  }
  return seen;
}

describe("leap years and month lengths", () => {
  it("follows the Gregorian rule", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(2100)).toBe(false);
    expect(isLeapYear(2400)).toBe(true);
  });

  it("knows every month's length", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => daysInMonth(2026, m))).toEqual([
      31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
    ]);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(1900, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
  });
});

describe("parseIsoDate / isIsoDate / isIsoTime / isIsoDateTime", () => {
  it("accepts real days only", () => {
    expect(parseIsoDate("2026-11-17")).toEqual({ year: 2026, month: 11, day: 17 });
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2026-04-31")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("2026-00-10")).toBe(false);
    expect(isIsoDate("0000-01-01")).toBe(false);
    expect(isIsoDate("9999-12-31")).toBe(true);
    expect(isIsoDate("2026-1-1")).toBe(false);
    expect(isIsoDate("")).toBe(false);
    expect(isIsoDate(null)).toBe(false);
  });

  it("checks times and date-times", () => {
    expect(isIsoTime("00:00")).toBe(true);
    expect(isIsoTime("23:59")).toBe(true);
    expect(isIsoTime("24:00")).toBe(false);
    expect(isIsoTime("12:60")).toBe(false);
    expect(isIsoTime("9:00")).toBe(false);
    expect(isIsoDateTime("2026-11-17T13:00")).toBe(true);
    expect(isIsoDateTime("9999-12-31T10:00")).toBe(true);
    expect(isIsoDateTime("2026-11-17T13:00:00")).toBe(false);
    expect(isIsoDateTime("2026-02-30T13:00")).toBe(false);
    expect(isIsoDateTime("2026-11-17")).toBe(false);
  });
});

describe("day arithmetic", () => {
  it("numbers days from 1970-01-01 and back", () => {
    expect(dayNumber("1970-01-01")).toBe(0);
    expect(dayNumber("1969-12-31")).toBe(-1);
    expect(dayNumber("2000-03-01")).toBe(11017);
    for (const iso of ["0001-01-01", "1600-02-29", "2024-02-29", "2026-12-31", "9999-12-31"]) {
      expect(fromDayNumber(dayNumber(iso))).toBe(iso);
    }
  });

  it("adds days across month, year and leap-day boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2100-02-28", 1)).toBe("2100-03-01");
    expect(addDays("2026-11-17", 0)).toBe("2026-11-17");
    expect(addDays("2026-01-01", 365)).toBe("2027-01-01");
    expect(addDays("2028-01-01", 365)).toBe("2028-12-31");
  });

  it("adds months and clamps to the end of a shorter month", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
    expect(addMonths("2026-05-31", 1)).toBe("2026-06-30");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
    expect(addMonths("2026-01-15", -1)).toBe("2025-12-15");
    expect(addMonths("2026-11-17", 14)).toBe("2028-01-17");
    expect(addMonths("2026-11-17", -23)).toBe("2024-12-17");
    expect(addMonths("2026-11-30", 0)).toBe("2026-11-30");
  });

  it("adds years, turning 29 February into 28 February in a common year", () => {
    expect(addYears("2028-02-29", 1)).toBe("2029-02-28");
    expect(addYears("2028-02-29", 4)).toBe("2032-02-29");
    expect(addYears("2026-11-17", -1)).toBe("2025-11-17");
  });

  it("counts the days between two days", () => {
    expect(diffDays("2026-11-01", "2026-11-30")).toBe(29);
    expect(diffDays("2028-02-01", "2028-03-01")).toBe(29);
    expect(diffDays("2026-02-01", "2026-03-01")).toBe(28);
    expect(diffDays("2026-11-17", "2026-11-10")).toBe(-7);
  });

  it("refuses an invalid day loudly", () => {
    expect(() => addDays("2026-02-30", 1)).toThrow(RangeError);
  });
});

describe("weeks and months", () => {
  it("numbers weekdays Monday first", () => {
    expect(weekdayOf("1970-01-01")).toBe(3); // Thursday
    expect(weekdayOf("2026-11-16")).toBe(0); // Monday
    expect(weekdayOf("2026-10-24")).toBe(5); // Saturday (DEMO_NOW)
    expect(weekdayOf("2026-11-22")).toBe(6); // Sunday
    expect(weekdayOf("2000-02-29")).toBe(1); // Tuesday
    expect(weekdayOf("1969-12-31")).toBe(2); // Wednesday
  });

  it("finds the week's Monday and Sunday across months and years", () => {
    expect(startOfWeek("2026-11-22")).toBe("2026-11-16");
    expect(startOfWeek("2026-11-16")).toBe("2026-11-16");
    expect(endOfWeek("2026-11-16")).toBe("2026-11-22");
    expect(startOfWeek("2027-01-01")).toBe("2026-12-28");
    expect(endOfWeek("2026-12-30")).toBe("2027-01-03");
  });

  it("finds a month's first and last day", () => {
    expect(startOfMonth("2026-11-17")).toBe("2026-11-01");
    expect(endOfMonth("2026-11-17")).toBe("2026-11-30");
    expect(endOfMonth("2028-02-03")).toBe("2028-02-29");
    expect(endOfMonth("2026-02-03")).toBe("2026-02-28");
    expect(endOfMonth("2026-12-01")).toBe("2026-12-31");
  });

  it("builds six Monday-first weeks for every month", () => {
    const november = monthGrid(2026, 11);
    expect(november).toHaveLength(6);
    expect(november.every((week) => week.length === 7)).toBe(true);
    // 1 November 2026 is a Sunday: the first row is 26 Oct … 1 Nov.
    expect(november[0]!.map((d) => d.iso)).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
    expect(november[0]!.map((d) => d.inMonth)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
    expect(november[5]!.at(-1)).toEqual({ iso: "2026-12-06", day: 6, inMonth: false, weekday: 6 });
    expect(november.flat().filter((d) => d.inMonth)).toHaveLength(30);
  });

  it("handles a leap February that starts on a Monday", () => {
    // 1 February 2027 is a Monday (a five-row month padded to six); 2028 is a leap year.
    const feb2027 = monthGrid(2027, 2);
    expect(feb2027[0]![0]).toMatchObject({ iso: "2027-02-01", inMonth: true });
    expect(feb2027.flat().filter((d) => d.inMonth)).toHaveLength(28);
    const feb2028 = monthGrid(2028, 2);
    expect(feb2028.flat().filter((d) => d.inMonth)).toHaveLength(29);
    expect(feb2028.flat().find((d) => d.iso === "2028-02-29")).toMatchObject({ weekday: 1 });
    expect(monthGrid(2026, 12).flat().at(-1)!.iso).toBe("2027-01-10");
  });
});

describe("clampIso / isWithin", () => {
  it("clamps days, times and date-times by string order", () => {
    expect(clampIso("2026-11-17", "2026-11-20")).toBe("2026-11-20");
    expect(clampIso("2026-11-17", undefined, "2026-11-10")).toBe("2026-11-10");
    expect(clampIso("2026-11-17", "2026-11-01", "2026-11-30")).toBe("2026-11-17");
    expect(clampIso("08:30", "09:00", "18:00")).toBe("09:00");
    expect(clampIso("2026-11-17T23:00", undefined, "2026-11-17T20:00")).toBe("2026-11-17T20:00");
    expect(isWithin("2026-11-17", "2026-11-17", "2026-11-17")).toBe(true);
    expect(isWithin("2026-11-18", undefined, "2026-11-17")).toBe(false);
    expect(isWithin("2026-11-18")).toBe(true);
  });
});

describe("display dates", () => {
  it("formats DD.MM.YYYY", () => {
    expect(formatDisplayDate("2026-11-07")).toBe("07.11.2026");
    expect(formatDisplayDate("")).toBe("");
    expect(formatDisplayDate("2026-02-30")).toBe("");
  });

  it("parses what people type and what tests fill", () => {
    expect(parseDisplayDate("17.11.2026")).toBe("2026-11-17");
    expect(parseDisplayDate("7.1.2026")).toBe("2026-01-07");
    expect(parseDisplayDate("17/11/2026")).toBe("2026-11-17");
    expect(parseDisplayDate("17-11-2026")).toBe("2026-11-17");
    expect(parseDisplayDate(" 17 11 2026 ")).toBe("2026-11-17");
    expect(parseDisplayDate("17112026")).toBe("2026-11-17");
    expect(parseDisplayDate("2026-11-17")).toBe("2026-11-17");
    expect(parseDisplayDate("2026-1-7")).toBe("2026-01-07");
    expect(parseDisplayDate("2026-11-17T10:00")).toBe("2026-11-17");
    expect(parseDisplayDate("2026-11-17T10:00:00+05:00")).toBe("2026-11-17");
    expect(parseDisplayDate("9999-12-31")).toBe("9999-12-31");
  });

  it("refuses partial and impossible days", () => {
    expect(parseDisplayDate("")).toBeNull();
    expect(parseDisplayDate("17.11.")).toBeNull();
    expect(parseDisplayDate("17.11.20")).toBeNull();
    expect(parseDisplayDate("17.11.202")).toBeNull();
    expect(parseDisplayDate("29.02.2026")).toBeNull();
    expect(parseDisplayDate("29.02.2028")).toBe("2028-02-29");
    expect(parseDisplayDate("29.02.1900")).toBeNull();
    expect(parseDisplayDate("29.02.2000")).toBe("2000-02-29");
    expect(parseDisplayDate("31.04.2026")).toBeNull();
    expect(parseDisplayDate("30.04.2026")).toBe("2026-04-30");
    expect(parseDisplayDate("31.12.2026")).toBe("2026-12-31");
    expect(parseDisplayDate("32.01.2026")).toBeNull();
    expect(parseDisplayDate("00.01.2026")).toBeNull();
    expect(parseDisplayDate("01.13.2026")).toBeNull();
    expect(parseDisplayDate("tomorrow")).toBeNull();
  });

  it("masks a day typed key by key", () => {
    expect(typeInto(maskDateDraft, "17112026")).toEqual([
      "1",
      "17.",
      "17.1",
      "17.11.",
      "17.11.2",
      "17.11.20",
      "17.11.202",
      "17.11.2026",
    ]);
  });

  it("masks pasted digits and never re-inserts a deleted dot", () => {
    expect(maskDateDraft("", "17112026")).toBe("17.11.2026");
    expect(maskDateDraft("", "1711")).toBe("17.11.");
    expect(maskDateDraft("", "171120")).toBe("17.11.20");
    expect(maskDateDraft("17.", "17")).toBe("17");
    expect(maskDateDraft("17.11.", "17.11")).toBe("17.11");
    expect(maskDateDraft("17.11", "17.112")).toBe("17.11.2");
    expect(maskDateDraft("1.", "1.12")).toBe("1.12.");
  });

  it("leaves ISO and separated input as typed", () => {
    expect(maskDateDraft("", "2026-11-17")).toBe("2026-11-17");
    expect(maskDateDraft("", "17/11/2026")).toBe("17/11/2026");
  });
});

describe("display times", () => {
  it("parses common shapes", () => {
    expect(parseDisplayTime("13:00")).toBe("13:00");
    expect(parseDisplayTime("9:05")).toBe("09:05");
    expect(parseDisplayTime("9.05")).toBe("09:05");
    expect(parseDisplayTime("0905")).toBe("09:05");
    expect(parseDisplayTime("905")).toBe("09:05");
    expect(parseDisplayTime("9")).toBe("09:00");
    expect(parseDisplayTime("13:00:00")).toBe("13:00");
    expect(parseDisplayTime("23:59")).toBe("23:59");
    expect(parseDisplayTime("18:03")).toBe("18:03");
  });

  it("refuses impossible times", () => {
    expect(parseDisplayTime("")).toBeNull();
    expect(parseDisplayTime("24:00")).toBeNull();
    expect(parseDisplayTime("12:60")).toBeNull();
    expect(parseDisplayTime("13:")).toBeNull();
    expect(parseDisplayTime("13:0")).toBeNull();
    expect(parseDisplayTime("noon")).toBeNull();
  });

  it("masks a time typed key by key", () => {
    expect(typeInto(maskTimeDraft, "1330")).toEqual(["1", "13:", "13:3", "13:30"]);
    expect(typeInto(maskTimeDraft, "930")).toEqual(["09:", "09:3", "09:30"]);
    expect(maskTimeDraft("", "1300")).toBe("13:00");
    expect(maskTimeDraft("13:", "13")).toBe("13");
  });

  it("converts minutes and builds the minute grid", () => {
    expect(timeToMinutes("13:45")).toBe(825);
    expect(minutesToTime(825)).toBe("13:45");
    expect(minutesToTime(1440 + 5)).toBe("00:05");
    expect(minutesToTime(-5)).toBe("23:55");
    expect(minuteSteps()).toHaveLength(12);
    expect(minuteSteps(15)).toEqual([0, 15, 30, 45]);
    expect(minuteSteps(1)).toHaveLength(60);
    expect(minuteSteps(60)).toEqual([0]);
    expect(minuteSteps(0)).toHaveLength(60);
  });
});

describe("display date-times", () => {
  it("splits and joins", () => {
    expect(splitDateTime("2026-11-17T13:00")).toEqual({ date: "2026-11-17", time: "13:00" });
    expect(splitDateTime("")).toEqual({ date: "", time: "" });
    expect(joinDateTime("2026-11-17", "13:00")).toBe("2026-11-17T13:00");
    expect(joinDateTime("2026-11-17", "")).toBe("");
    expect(joinDateTime("2026-02-30", "13:00")).toBe("");
  });

  it("formats and parses", () => {
    expect(formatDisplayDateTime("2026-11-17T13:00")).toBe("17.11.2026 13:00");
    expect(formatDisplayDateTime("2026-11-17")).toBe("");
    expect(parseDisplayDateTime("17.11.2026 13:00")).toBe("2026-11-17T13:00");
    expect(parseDisplayDateTime("17.11.2026, 9:05")).toBe("2026-11-17T09:05");
    expect(parseDisplayDateTime("2026-11-17T13:00")).toBe("2026-11-17T13:00");
    expect(parseDisplayDateTime("2026-11-17T13:00:00")).toBe("2026-11-17T13:00");
    expect(parseDisplayDateTime("2026-11-17 13:00")).toBe("2026-11-17T13:00");
    expect(parseDisplayDateTime("9999-12-31T10:00")).toBe("9999-12-31T10:00");
    expect(parseDisplayDateTime("17.11.2026 13.30")).toBe("2026-11-17T13:30");
    expect(parseDisplayDateTime("2026-11-17T08:00:00Z")).toBe("2026-11-17T13:00");
    expect(parseDisplayDateTime("2026-11-17T13:00:00+05:00")).toBe("2026-11-17T13:00");
  });

  it("refuses partial input", () => {
    expect(parseDisplayDateTime("")).toBeNull();
    expect(parseDisplayDateTime("17.11.2026")).toBeNull();
    expect(parseDisplayDateTime("17.11.2026 13:")).toBeNull();
    expect(parseDisplayDateTime("29.02.2026 10:00")).toBeNull();
    expect(parseDisplayDateTime("17.11.2026 25:00")).toBeNull();
  });

  it("masks a date-time typed key by key", () => {
    expect(typeInto(maskDateTimeDraft, "171120261330").at(-1)).toBe("17.11.2026 13:30");
    expect(typeInto(maskDateTimeDraft, "17112026").at(-1)).toBe("17.11.2026 ");
    expect(maskDateTimeDraft("", "171120261330")).toBe("17.11.2026 13:30");
    expect(maskDateTimeDraft("", "2026-11-17T13:00")).toBe("2026-11-17T13:00");
    expect(maskDateTimeDraft("17.11.2026 ", "17.11.2026")).toBe("17.11.2026");
  });
});

describe("Tashkent wall clock", () => {
  it("reads now in UTC+5 whatever the machine's zone", () => {
    expect(tashkentNow(Date.parse("2026-11-16T18:59:00Z"))).toBe("2026-11-16T23:59");
    expect(tashkentToday(Date.parse("2026-11-16T19:00:00Z"))).toBe("2026-11-17");
    expect(tashkentToday(new Date("2026-12-31T19:30:00Z"))).toBe("2027-01-01");
    expect(tashkentToday(Date.parse("2028-02-28T19:00:00Z"))).toBe("2028-02-29");
  });

  it("converts the API's aware datetimes", () => {
    expect(toLocalInput("2026-11-01T00:00:00+05:00")).toBe("2026-11-01T00:00");
    expect(toLocalInput("2026-10-31T19:30:00Z")).toBe("2026-11-01T00:30");
    expect(toLocalInput(null)).toBe("");
    expect(toLocalInput("garbage")).toBe("");
    expect(fromLocalInput("2026-11-01T00:00")).toBe("2026-11-01T00:00:00+05:00");
    expect(fromLocalInput("2026-11-01T09:15:30")).toBe("2026-11-01T09:15:30+05:00");
    expect(fromLocalInput("2026-02-29T10:00")).toBeNull();
    expect(fromLocalInput("2026-11-01T24:00")).toBeNull();
    expect(fromLocalInput("")).toBeNull();
    const iso = "2026-11-20T18:45:00+05:00";
    expect(fromLocalInput(toLocalInput(iso))).toBe(iso);
  });
});
