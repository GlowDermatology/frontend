import { describe, expect, it } from "vitest";

import { formatIdentifierInput, identifierBody, looksLike, parseIdentifier } from "./identifier";

describe("looksLike", () => {
  it("reads an @ or any letter as an e-mail address, digits as a phone", () => {
    expect(looksLike("")).toBe("empty");
    expect(looksLike("   ")).toBe("empty");
    expect(looksLike("90 123")).toBe("phone");
    expect(looksLike("+998")).toBe("phone");
    expect(looksLike("(90) 123-45-67")).toBe("phone");
    expect(looksLike("malika")).toBe("email");
    expect(looksLike("m@")).toBe("email");
    expect(looksLike("малика")).toBe("email");
  });
});

describe("parseIdentifier", () => {
  it("normalises Uzbek phone numbers to E.164", () => {
    for (const input of [
      "+998 90 123 45 67",
      "998901234567",
      "90 123 45 67",
      "901234567",
      " +998901234567 ",
    ]) {
      expect(parseIdentifier(input)).toEqual({ kind: "phone", phone: "+998901234567" });
    }
  });

  it("lower-cases and validates e-mail addresses", () => {
    expect(parseIdentifier("  Malika@Mail.UZ ")).toEqual({
      kind: "email",
      email: "malika@mail.uz",
    });
    expect(parseIdentifier("malika@mail")).toEqual({ kind: "invalid", looksLike: "email" });
    expect(parseIdentifier("ma lika@mail.uz")).toEqual({ kind: "invalid", looksLike: "email" });
    expect(parseIdentifier(`${"a".repeat(250)}@mail.uz`).kind).toBe("invalid");
  });

  it("refuses short, foreign or empty phones", () => {
    expect(parseIdentifier("90 123")).toEqual({ kind: "invalid", looksLike: "phone" });
    expect(parseIdentifier("+7 912 345 67 89")).toEqual({ kind: "invalid", looksLike: "phone" });
    expect(parseIdentifier("")).toEqual({ kind: "empty" });
    expect(parseIdentifier(undefined)).toEqual({ kind: "empty" });
    expect(parseIdentifier(42)).toEqual({ kind: "empty" });
  });

  it("builds the one-identifier API body", () => {
    expect(identifierBody({ kind: "phone", phone: "+998901234567" })).toEqual({
      phone: "+998901234567",
    });
    expect(identifierBody({ kind: "email", email: "a@b.uz" })).toEqual({ email: "a@b.uz" });
  });
});

describe("formatIdentifierInput", () => {
  it("masks a phone while typing and keeps the country code being typed", () => {
    expect(formatIdentifierInput("9")).toBe("+998 9");
    expect(formatIdentifierInput("901234567")).toBe("+998 90 123 45 67");
    expect(formatIdentifierInput("+")).toBe("+");
    expect(formatIdentifierInput("+9")).toBe("+9");
    expect(formatIdentifierInput("+99")).toBe("+99");
    expect(formatIdentifierInput("+9989")).toBe("+998 9");
    expect(formatIdentifierInput("+998 90 123")).toBe("+998 90 123");
  });

  it("leaves an e-mail address as typed", () => {
    expect(formatIdentifierInput("Malika@")).toBe("Malika@");
    expect(formatIdentifierInput("m")).toBe("m");
  });
});
