import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Playwright helpers for the admin UI kit's custom controls (`src/components/ui`): the Radix
 * `Select` (and `SelectMenu`, which wraps it), the date/time pickers and disabled-reason buttons.
 * They rely on roles and the kit's `data-*` hooks, not on the visible language, so a spec works
 * whichever admin language is active as long as it names fields by their labels.
 *
 * `scope` is the page or any locator that contains the control (a dialog, a card); lists and
 * calendars are portalled, so they are looked up on the page.
 */
type Scope = Page | Locator;
type Label = string | RegExp;

function pageOf(scope: Scope): Page {
  return "page" in scope && typeof scope.page === "function" ? scope.page() : (scope as Page);
}

/** A string label matches exactly (like the native inputs' specs did); a RegExp matches loosely. */
function byLabel(scope: Scope, label: Label): Locator {
  return typeof label === "string"
    ? scope.getByLabel(label, { exact: true })
    : scope.getByLabel(label);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The `Select` trigger (`role="combobox"`) named `label` (its `<label>`, or `aria-label` on filters). */
export function selectTrigger(scope: Scope, label: Label): Locator {
  return scope.getByRole("combobox", { name: label, exact: typeof label === "string" });
}

/**
 * Opens the `Select` named `label` and chooses the option whose label is `option` (exactly, so
 * «Faol» never picks «Faol emas»; an option's second line is ignored). Before hydration a
 * `nativeFallback` select is a real `<select>`: then the native choice is made.
 */
export async function selectOption(scope: Scope, label: Label, option: string): Promise<void> {
  const trigger = selectTrigger(scope, label);
  if ((await trigger.evaluate((node) => node.tagName)) === "SELECT") {
    await trigger.selectOption({ label: option });
    return;
  }
  await trigger.click();
  const page = pageOf(scope);
  const list = page.getByRole("listbox");
  await expect(list).toBeVisible();
  await list
    .getByRole("option")
    .filter({ has: page.getByText(option, { exact: true }) })
    .first()
    .click();
  await expect(list).toBeHidden();
}

/** The value the `Select` named `label` holds (its trigger's `data-value`; "" = nothing chosen). */
export async function selectValue(scope: Scope, label: Label): Promise<string> {
  return (await selectTrigger(scope, label).getAttribute("data-value")) ?? "";
}

/**
 * Types a value into a picker's text field the way a person pastes it, then leaves the field
 * (blur), which applies it in every commit mode (forms hand it on at once, toolbars on blur).
 * The pickers accept ISO, so the values are the same ones the native inputs took.
 */
async function fillPicker(scope: Scope, label: Label, value: string): Promise<Locator> {
  const input = byLabel(scope, label);
  await input.fill(value);
  await input.blur();
  return input;
}

/** `DatePicker` (and each side of `DateRangePicker`): `iso` = `YYYY-MM-DD` or "" to clear. */
export async function fillDate(scope: Scope, label: Label, iso: string): Promise<void> {
  await fillPicker(scope, label, iso);
}

/** `TimePicker`: `time` = `HH:MM` (an off-step time such as 18:03 is handed on as typed). */
export async function fillTime(scope: Scope, label: Label, time: string): Promise<void> {
  await fillPicker(scope, label, time);
}

/** `DateTimePicker`: `value` = `YYYY-MM-DDTHH:MM` (Tashkent wall clock). */
export async function fillDateTime(scope: Scope, label: Label, value: string): Promise<void> {
  await fillPicker(scope, label, value);
}

/**
 * The ISO value a picker or `PhoneInput` holds: the hidden input next to its text field (only
 * rendered when the picker has a `name`), else the shown text. Use it where a spec asserted the
 * native input's value, e.g. `expect(await pickerValue(page, "Yuborish vaqti (Toshkent)"))
 * .toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)`.
 */
export async function pickerValue(scope: Scope, label: Label): Promise<string> {
  const input = byLabel(scope, label);
  const hidden = input
    .locator("xpath=ancestor::*[@data-picker][1]")
    .locator('input[type="hidden"]');
  if ((await hidden.count()) > 0) return hidden.first().inputValue();
  return input.inputValue();
}

/**
 * Chooses `iso` (`YYYY-MM-DD`) with the mouse in the calendar of the `DatePicker` (or
 * `DateTimePicker`) named `label`: opens the popover, pages month by month to the target and
 * clicks the day. Fails if the day is disabled.
 */
export async function pickDate(scope: Scope, label: Label, iso: string): Promise<void> {
  const input = byLabel(scope, label);
  const shell = input.locator("xpath=ancestor::*[@data-picker][1]");
  await shell.locator('button[aria-haspopup="dialog"]').click();
  const page = pageOf(scope);
  const calendar = page.locator('[role="dialog"][data-state="open"]').filter({
    has: page.locator('table[role="grid"]'),
  });
  const grid = calendar.locator('table[role="grid"]');
  await expect(grid).toBeVisible();
  const target = iso.slice(0, 7);
  for (let step = 0; step < 1200; step += 1) {
    const month = (await grid.getAttribute("data-month")) ?? target;
    if (month === target) break;
    await calendar.locator(`[data-calendar-nav="${month < target ? "next" : "previous"}"]`).click();
  }
  const day = grid.locator(`td[data-date="${iso}"]`).first();
  await expect(day).not.toHaveAttribute("aria-disabled", "true");
  await day.click();
}

/**
 * A control that cannot be used right now and says why: `aria-disabled="true"` (it stays
 * focusable) and an accessible description containing `reason` (the kit's `disabledReason`).
 */
export async function expectDisabledReason(
  target: Locator,
  reason: string | RegExp,
): Promise<void> {
  await expect(target).toHaveAttribute("aria-disabled", "true");
  await expect(target).toHaveAccessibleDescription(
    typeof reason === "string" ? new RegExp(escapeRegExp(reason)) : reason,
  );
}
