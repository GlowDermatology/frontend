import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  INVALID_SELECTOR,
  SHAKE_MS,
  attributeValue,
  findRevealTarget,
  focusElementFor,
  revealFirstError,
  scrollBehavior,
  type RevealElement,
} from "./reveal";
import { flattenFieldErrors, labelFor, orderLike, summarizeFieldErrors } from "./rhf";

/** A stand-in element: answers the selectors it is told about, records what happens to it. */
class FakeElement implements RevealElement {
  queries = new Map<string, FakeElement>();
  attributes = new Map<string, string>();
  focusable = false;
  box: FakeElement | null = null;
  isConnected = true;
  focused = 0;
  scrolled: ScrollIntoViewOptions[] = [];

  constructor(readonly label: string) {}

  answer(selector: string, element: FakeElement): this {
    this.queries.set(selector, element);
    return this;
  }
  querySelector(selector: string): FakeElement | null {
    return this.queries.get(selector) ?? null;
  }
  matches(selector: string): boolean {
    return this.focusable && selector.includes("input");
  }
  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }
  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }
  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
  closest(selector: string): FakeElement | null {
    return selector === "[data-reveal-box]" ? this.box : null;
  }
  focus(): void {
    this.focused += 1;
  }
  scrollIntoView(options?: ScrollIntoViewOptions): void {
    this.scrolled.push(options ?? {});
  }
}

describe("revealFirstError", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("scrolls to the middle, focuses and rings the first invalid field", async () => {
    const input = new FakeElement("price");
    input.focusable = true;
    const form = new FakeElement("form").answer(INVALID_SELECTOR, input);

    const revealed = await revealFirstError(form);

    expect(revealed).toBe(input);
    expect(input.focused).toBe(1);
    expect(input.scrolled[0]).toMatchObject({ block: "center" });
    expect(input.attributes.has("data-shake")).toBe(true);
    vi.advanceTimersByTime(SHAKE_MS);
    expect(input.attributes.has("data-shake")).toBe(false);
  });

  it("returns null when nothing is invalid", async () => {
    expect(await revealFirstError(new FakeElement("form"))).toBeNull();
    expect(await revealFirstError(null)).toBeNull();
  });

  it("finds a field by name through data-field, then a visible name", async () => {
    const card = new FakeElement("images");
    card.attributes.set("tabindex", "-1");
    const form = new FakeElement("form").answer(`[data-field="images"]`, card);
    expect(findRevealTarget(form, "images")).toBe(card);

    const input = new FakeElement("title");
    const byName = new FakeElement("form").answer(`[name="title"]:not([type="hidden"])`, input);
    expect(findRevealTarget(byName, "title")).toBe(input);

    /* The image card has a tabindex: it is focused itself. */
    expect(await revealFirstError(form, { name: "images" })).toBe(card);
    expect(card.focused).toBe(1);
  });

  it("focuses the invalid control inside a non-focusable wrapper and rings the reveal box", async () => {
    const input = new FakeElement("amount");
    input.focusable = true;
    const frame = new FakeElement("frame");
    input.box = frame;
    const wrapper = new FakeElement("wrapper").answer(INVALID_SELECTOR, input);
    expect(focusElementFor(wrapper)).toBe(input);

    const form = new FakeElement("form").answer(`[data-field="amount"]`, wrapper);
    await revealFirstError(form, { name: "amount" });
    expect(input.focused).toBe(1);
    expect(frame.scrolled).toHaveLength(1);
    expect(frame.attributes.has("data-shake")).toBe(true);
    expect(input.attributes.has("data-shake")).toBe(false);
  });

  it("runs beforeReveal first and can skip the shake", async () => {
    vi.useRealTimers();
    const input = new FakeElement("name_ru");
    input.focusable = true;
    const form = new FakeElement("form").answer(INVALID_SELECTOR, input);
    const order: string[] = [];
    const beforeReveal = vi.fn(async () => {
      order.push(`before:${input.focused}`);
    });

    await revealFirstError(form, { beforeReveal, shake: false });

    expect(beforeReveal).toHaveBeenCalledWith(input);
    expect(order).toEqual(["before:0"]);
    expect(input.focused).toBe(1);
    expect(input.attributes.has("data-shake")).toBe(false);
  });

  it("escapes names in selectors", () => {
    expect(attributeValue('a"b\\c')).toBe('"a\\"b\\\\c"');
  });
});

describe("React Hook Form errors", () => {
  const errors = {
    title: { type: "required", message: "Nomni kiriting", ref: { name: "title" } },
    price: { type: "min", message: "" },
    variants: [undefined, { sku: { type: "required", message: "SKU kiriting" } }],
    images: { root: { type: "min", message: "Kamida bitta rasm" } },
    seo: { description: { type: "max", message: "160 belgidan oshmasin" } },
    root: { server: { type: "server", message: "Server xatosi" } },
  };

  it("flattens nested objects and arrays, skipping empty and form-level errors", () => {
    expect(flattenFieldErrors(errors)).toEqual([
      { name: "title", message: "Nomni kiriting" },
      { name: "variants.1.sku", message: "SKU kiriting" },
      { name: "images", message: "Kamida bitta rasm" },
      { name: "seo.description", message: "160 belgidan oshmasin" },
    ]);
  });

  it("labels exact paths, array wildcards, parents, then the path", () => {
    const labels = { title: "Nomi", "variants.*.sku": "SKU", seo: "SEO" };
    expect(labelFor("title", labels)).toBe("Nomi");
    expect(labelFor("variants.1.sku", labels)).toBe("SKU");
    expect(labelFor("seo.description", labels)).toBe("SEO");
    expect(labelFor("unknown", labels)).toBe("unknown");
    expect(labelFor("x", (name) => (name === "x" ? "Iks" : undefined))).toBe("Iks");
    expect(summarizeFieldErrors(errors, labels)[0]).toEqual({
      name: "title",
      label: "Nomi",
      message: "Nomni kiriting",
    });
  });

  it("keeps the submit-time field order for live errors", () => {
    const reference = [{ name: "b" }, { name: "a" }];
    expect(orderLike([{ name: "a" }, { name: "c" }, { name: "b" }], reference)).toEqual([
      { name: "b" },
      { name: "a" },
      { name: "c" },
    ]);
  });
});

describe("scrollBehavior", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("scrolls smoothly unless the system asks for reduced motion", () => {
    const media = (reduce: boolean) => ({
      matchMedia: (query: string) => ({ matches: reduce && query.includes("reduce") }),
    });
    vi.stubGlobal("window", media(false));
    expect(scrollBehavior()).toBe("smooth");
    vi.stubGlobal("window", media(true));
    expect(scrollBehavior()).toBe("auto");
  });
});
