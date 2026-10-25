import { describe, expect, it } from "vitest";

import { csvCell, csvDocument } from "./export-csv";

/** Contract §1.8 formula safety, as the backend writes it. */
describe("csvCell", () => {
  it("prefixes text that could be read as a formula", () => {
    expect(csvCell("=SUM(A1)")).toBe(`"'=SUM(A1)"`);
    expect(csvCell("-5")).toBe(`"'-5"`);
    expect(csvCell("@x")).toBe(`"'@x"`);
    expect(csvCell("+1+2")).toBe(`"'+1+2"`);
    expect(csvCell('a "b"')).toBe(`"a ""b"""`);
  });

  it("keeps an exact E.164 phone plain, as the API does", () => {
    expect(csvCell("+998901234567")).toBe(`"+998901234567"`);
    expect(csvCell("+1234567")).toBe(`"+1234567"`);
  });

  it("still prefixes phone-like values that are not exactly E.164", () => {
    expect(csvCell("+0998901234567")).toBe(`"'+0998901234567"`);
    expect(csvCell("+123456")).toBe(`"'+123456"`);
    expect(csvCell("+998 90 123 45 67")).toBe(`"'+998 90 123 45 67"`);
    expect(csvCell("+9989012345670000")).toBe(`"'+9989012345670000"`);
  });

  it("leaves numbers, booleans and empties unprefixed", () => {
    expect(csvCell(-5)).toBe(`"-5"`);
    expect(csvCell(true)).toBe(`"Ha"`);
    expect(csvCell(null)).toBe(`""`);
  });

  it("writes a BOM, ; separators and CRLF", () => {
    expect(csvDocument(["Telefon"], [["+998901234567"]])).toBe('﻿"Telefon"\r\n"+998901234567"\r\n');
  });
});
