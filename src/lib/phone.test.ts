import { describe, expect, it } from "vitest";

import { maskPhone, maskTypedPhone, normalizePhone } from "./phone";

/** Feeds the mask one key at a time, the way an input's onChange sees it. */
function typeKeys(keys: string, start = ""): string[] {
  const seen: string[] = [];
  let value = start;
  for (const key of keys) {
    value = maskPhone(value + key);
    seen.push(value);
  }
  return seen;
}

/** Backspace at the end of the field, one character at a time. */
function backspaceAll(start: string): string[] {
  const seen: string[] = [];
  let value = start;
  while (value) {
    value = maskPhone(value.slice(0, -1));
    seen.push(value);
  }
  return seen;
}

describe("maskPhone", () => {
  it("types 901234567 key by key into +998 90 123 45 67", () => {
    expect(typeKeys("901234567")).toEqual([
      "+998 9",
      "+998 90",
      "+998 90 1",
      "+998 90 12",
      "+998 90 123",
      "+998 90 123 4",
      "+998 90 123 45",
      "+998 90 123 45 6",
      "+998 90 123 45 67",
    ]);
  });

  it("types the support phone 712000001 without scrambling it", () => {
    expect(typeKeys("712000001").at(-1)).toBe("+998 71 200 00 01");
  });

  it("ignores keys past nine national digits", () => {
    expect(typeKeys("8", "+998 90 123 45 67")).toEqual(["+998 90 123 45 67"]);
  });

  it("removes one digit per backspace and clears the field at the prefix", () => {
    expect(backspaceAll("+998 90 123 45 67")).toEqual([
      "+998 90 123 45 6",
      "+998 90 123 45",
      "+998 90 123 4",
      "+998 90 123",
      "+998 90 12",
      "+998 90 1",
      "+998 90",
      "+998 9",
      "",
    ]);
  });

  it("drops the separator space with the digit before it", () => {
    expect(maskPhone("+998 90 123 ")).toBe("+998 90 123");
    expect(maskPhone("+998 90 ")).toBe("+998 90");
  });

  it("never reads the remains of a deleted prefix as national digits", () => {
    expect(maskPhone("+998 ")).toBe("");
    expect(maskPhone("+998")).toBe("");
    expect(maskPhone("+99")).toBe("");
    expect(maskPhone("+9")).toBe("");
    expect(maskPhone("+")).toBe("");
    expect(maskPhone("+98 90 123 45 67")).toBe("+998 90 123 45 67");
  });

  it("accepts pasted numbers in every common shape", () => {
    expect(maskPhone("+998901234567")).toBe("+998 90 123 45 67");
    expect(maskPhone("+998 90 123 45 67")).toBe("+998 90 123 45 67");
    expect(maskPhone("998901234567")).toBe("+998 90 123 45 67");
    expect(maskPhone("90 123 45 67")).toBe("+998 90 123 45 67");
    expect(maskPhone("+ 998 90 123 45 67")).toBe("+998 90 123 45 67");
    expect(maskPhone("")).toBe("");
  });

  it("keeps a typed number intact through normalizePhone", () => {
    expect(normalizePhone(typeKeys("901234567").at(-1)!)).toBe("+998901234567");
  });
});

/** Feeds the shop phone field one key at a time (its onChange keeps a country code being typed). */
function typeIntoField(keys: string): string {
  let value = "";
  for (const key of keys) value = maskTypedPhone(value + key, value);
  return value;
}

describe("typing the country code", () => {
  it("keeps +998 typed key by key and never turns it into national digits", () => {
    expect(typeIntoField("+998901234567")).toBe("+998 90 123 45 67");
    expect(typeIntoField("+998 90 123 45 67")).toBe("+998 90 123 45 67");
  });

  it("reads 998 typed without the plus as the country code once past nine digits", () => {
    expect(typeIntoField("998901234567")).toBe("+998 90 123 45 67");
    expect(maskPhone("+998 99 890 12 345")).toBe("+998 90 123 45");
  });

  it("keeps a national number starting with 99 8 intact", () => {
    expect(typeIntoField("998123456")).toBe("+998 99 812 34 56");
  });

  it("still clears the field when deleting into the prefix", () => {
    expect(maskTypedPhone("+998 ", "+998 9")).toBe("");
    expect(maskTypedPhone("+", "")).toBe("+");
  });
});
