import { describe, expect, it } from "vitest";

import { accountCopy } from "./account";
import { authCopy } from "./auth";
import { bookingCopy } from "./booking";
import { commonCopy } from "./common";
import { inboxCopy } from "./inbox";
import { loyaltyCopy } from "./loyalty";
import { ordersCopy } from "./orders";

/** The private-area copy modules: same keys in uz/ru/en, no empty strings, the uz ‘ mark. */

const MODULES = {
  accountCopy,
  authCopy,
  bookingCopy,
  commonCopy,
  inboxCopy,
  loyaltyCopy,
  ordersCopy,
};

function leaves(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === "function" ? [`${prefix}${key}`] : leaves(child, `${prefix}${key}.`),
  );
}

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value !== "object" || value === null) return [];
  return Object.values(value).flatMap(strings);
}

describe.each(Object.entries(MODULES))("%s", (_name, copy) => {
  it("has the same keys in every language", () => {
    expect(leaves(copy.ru).sort()).toEqual(leaves(copy.uz).sort());
    expect(leaves(copy.en).sort()).toEqual(leaves(copy.uz).sort());
  });

  it("spells the Uzbek o‘/g‘ mark with U+2018", () => {
    expect(strings(copy.uz).filter((text) => /[OoGg]['`ʻʼ’]/.test(text))).toEqual([]);
  });

  it("has no empty strings", () => {
    for (const dict of [copy.uz, copy.ru, copy.en]) {
      // The ru/en `terms.after` is intentionally empty (the phrase ends with the link).
      expect(strings(dict).filter((text) => text.trim() === "" && text !== "")).toEqual([]);
    }
  });
});

describe("interpolated copy", () => {
  it("renders counts and money per language", () => {
    expect(ordersCopy.uz.money(784400)).toBe("784\u00a0400\u00a0so‘m");
    expect(ordersCopy.en.money(784400)).toBe("784,400\u00a0UZS");
    expect(ordersCopy.ru.cart.items(3)).toBe("Товары (3 товара)");
    expect(commonCopy.uz.code.resendIn(42)).toBe("Yangi kodni 42 soniyadan so‘ng so‘rash mumkin");
    expect(accountCopy.en.sessions.revokedOthers(1)).toBe("1 session signed out");
    expect(bookingCopy.ru.booking.experience(11)).toBe("Опыт 11 лет");
    expect(bookingCopy.ru.booking.experience(22)).toBe("Опыт 22 года");
  });
});
