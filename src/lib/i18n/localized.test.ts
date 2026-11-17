import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { localized } from "./localized";
import { validationCopy } from "./validation-copy";

describe("localized", () => {
  it("builds one value per language, lazily and once", () => {
    const build = vi.fn((locale: string) => `value-${locale}`);
    const values = localized(build);
    expect(build).not.toHaveBeenCalled();
    expect(values.ru).toBe("value-ru");
    expect(values.ru).toBe("value-ru");
    expect(build).toHaveBeenCalledTimes(1);
    expect(Object.keys(values)).toEqual(["uz", "ru", "en"]);
    expect(Object.isFrozen(values)).toBe(true);
  });

  it("hands the language's copy to a schema factory", () => {
    const schemas = localized(validationCopy, (m) =>
      z.object({ name: z.string().min(2, m.minChars(2)) }),
    );
    const message = (locale: "uz" | "ru" | "en") =>
      schemas[locale].safeParse({ name: "a" }).error?.issues[0]?.message;
    expect(message("uz")).toBe("Kamida 2 ta belgi kiriting.");
    expect(message("ru")).toBe("Введите не менее 2 символов.");
    expect(message("en")).toBe("Enter at least 2 characters.");
  });
});
