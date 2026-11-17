import { createElement, type FC, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/admin/notifications",
  useSearchParams: () => new URLSearchParams(),
}));

import { ToastProvider } from "@/components/ui/toast";
import { NOTIFICATION_HISTORY, STATUS_TEMPLATES, TEST_DEVICES } from "@/data/mock/notifications";
import { notificationDataCopy } from "@/domain/copy/notifications";
import {
  audienceText,
  campaignRecommendedMissing,
  notificationImageProblem,
  notificationStateLabel,
  templateRecommendedMissing,
  templateRecommendedToAsk,
} from "@/domain/notification";
import { AdminLocaleProvider } from "@/lib/i18n/admin-context";
import type { Locale } from "@/lib/i18n/locales";

import { CampaignPanel } from "./campaign-panel";
import { composerSchema } from "./composer";
import { notificationsCopy } from "./copy";
import { templateErrors, TemplatesSection } from "./templates-section";
import { testDeviceErrors, TestDevicesCard } from "./test-devices-card";

/**
 * The notifications screen in the admin languages (DESIGN §G): audience words, the composer's
 * and the dialogs' rules with their messages, the recommended-fields checks, and the panel, the
 * templates and the test devices card in a server render.
 */

const LocaleProvider = AdminLocaleProvider as FC<{ locale: Locale; children?: ReactNode }>;
const Toasts = ToastProvider as FC<{ children?: ReactNode }>;
const render = (node: ReturnType<typeof createElement>, locale: Locale = "uz") =>
  renderToStaticMarkup(
    createElement(LocaleProvider, { locale }, createElement(Toasts, null, node)),
  );

const record = (id: string) => NOTIFICATION_HISTORY.find((r) => r.id === id)!;
const NOW = "2026-10-24T12:00:00+05:00";
const valid = {
  kind: "promo" as const,
  title: "Qishki aksiya",
  body: "Barcha kremlarga 15% chegirma.",
  link: "none",
  linkUrl: "",
  audience: "all" as const,
  segmentId: "",
  phone: "",
  when: "asap" as const,
  scheduledAt: "",
};
const messages = (result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) => Object.fromEntries((result.error?.issues ?? []).map((i) => [i.path.join("."), i.message]));

describe("audience and state words", () => {
  const group = {
    audience: { type: "group" as const, segmentId: "1" },
    audienceName: "Doimiy mijozlar",
    recipientCount: 612,
  };
  it("names the audience in each language, keeping the group's own name", () => {
    expect(
      audienceText({ audience: { type: "all" }, audienceName: null, recipientCount: 4751 }),
    ).toBe("Barcha · 4\u00a0751");
    expect(audienceText(group, "ru")).toBe("Doimiy mijozlar · 612");
    expect(
      audienceText(
        {
          audience: { type: "one", phone: "+998901234567" },
          audienceName: null,
          recipientCount: 1,
        },
        "en",
      ),
    ).toBe("One customer · +998 90 123 45 67");
    expect(audienceText({ ...group, audienceName: null }, "en")).toBe("Group · 612");
    expect(
      audienceText({ audience: { type: "all" }, audienceName: null, recipientCount: 4751 }, "en"),
    ).toBe("Everyone · 4,751");
  });

  it("labels states per language and keeps an unknown one as it is", () => {
    expect(notificationStateLabel("partially_sent")).toBe("Qisman yuborildi");
    expect(notificationStateLabel("partially_sent", "ru")).toBe("Отправлено частично");
    expect(notificationStateLabel("archived", "en")).toBe("archived");
  });

  it("explains a refused image in the admin language", () => {
    expect(notificationImageProblem({ type: "image/gif", size: 1 }, "en")).toBe(
      notificationDataCopy.en.imageType,
    );
    expect(notificationImageProblem({ type: "image/png", size: 6 * 1024 * 1024 }, "ru")).toBe(
      notificationDataCopy.ru.imageTooLarge,
    );
  });
});

describe("composer rules", () => {
  it("accepts a whole campaign and answers each rule in the admin language", () => {
    expect(composerSchema(NOW, "uz").safeParse(valid).success).toBe(true);
    const ru = composerSchema(NOW, "ru").safeParse({
      ...valid,
      title: "Hi",
      link: "url",
      linkUrl: "http://glowderma.uz",
      audience: "one",
      phone: "+99890123",
      when: "later",
      scheduledAt: "2026-10-24T11:00",
    });
    expect(messages(ru)).toEqual({
      title: notificationDataCopy.ru.schema.titleMin,
      linkUrl: notificationDataCopy.ru.schema.linkUrlHttps,
      phone: notificationDataCopy.ru.schema.phone,
      scheduledAt: notificationDataCopy.ru.schema.futureTime,
    });
  });

  it("asks for a whole send time and a group", () => {
    const en = composerSchema(NOW, "en").safeParse({
      ...valid,
      audience: "group",
      when: "later",
      scheduledAt: "2026-10-2",
    });
    expect(messages(en)).toEqual({
      segmentId: notificationDataCopy.en.schema.chooseGroup,
      scheduledAt: notificationDataCopy.en.schema.chooseTime,
    });
    expect(
      composerSchema(NOW, "uz").safeParse({
        ...valid,
        when: "later",
        scheduledAt: "2026-10-25T10:00",
      }).success,
    ).toBe(true);
  });

  it("recommends a tap destination for a promotion only", () => {
    expect(campaignRecommendedMissing({ kind: "promo", link: "none" })).toEqual(["link"]);
    expect(campaignRecommendedMissing({ kind: "promo", link: "product:1" })).toEqual([]);
    expect(campaignRecommendedMissing({ kind: "general", link: "none" })).toEqual([]);
  });
});

describe("templates and test devices", () => {
  it("checks a template like the backend, per language", () => {
    expect(templateErrors({ uz: "Buyurtma №{raqam} tayyor.", ru: "", en: "" }, "uz")).toEqual({});
    expect(templateErrors({ uz: "abc", ru: "Заказ {ism}", en: "x".repeat(181) }, "en")).toEqual({
      "texts.uz": "Enter at least 5 characters.",
      "texts.ru": notificationDataCopy.en.schema.placeholders("{raqam}", "{ism}"),
      "texts.en": "No more than 180 characters.",
    });
    expect(templateRecommendedMissing({ uz: "Matn bor", ru: " ", en: "Ready" })).toEqual(["ru"]);
    const saved = { uz: "Buyurtma №{raqam} tayyor.", ru: "", en: "Order ready" };
    // Unchanged → no question; uz changed → the empty ru; en just cleared → en.
    expect(templateRecommendedToAsk(saved, saved)).toEqual([]);
    expect(templateRecommendedToAsk({ ...saved, uz: "Buyurtma №{raqam} yo‘lda." }, saved)).toEqual([
      "ru",
    ]);
    expect(templateRecommendedToAsk({ ...saved, en: "" }, saved)).toEqual(["en"]);
  });

  it("checks a test device before the round trip", () => {
    expect(testDeviceErrors({ phone: "+998901234567", label: "Dilnoza iPhone" }, "uz")).toEqual({});
    expect(testDeviceErrors({ phone: "+99890", label: " a " }, "ru")).toEqual({
      phone: notificationDataCopy.ru.schema.phone,
      label: notificationDataCopy.ru.schema.deviceLabelMin,
    });
  });
});

describe("server render", () => {
  const me = { id: "1", isSuperuser: true };
  const panel = (id: string, locale: Locale) =>
    render(
      createElement(CampaignPanel, {
        record: record(id),
        me,
        approvalDelayMinutes: 5,
        testDevices: TEST_DEVICES,
        onReplace: () => {},
        onDrop: () => {},
        onEdit: () => {},
        onClose: () => {},
      }),
      locale,
    );

  it("shows a draft's controls in English with no Uzbek left", () => {
    const html = panel("n-9", "en");
    const en = notificationsCopy.en.panel;
    for (const text of [en.edit, en.delete, en.sendTest, en.close, en.estimate, "Draft"]) {
      expect(html).toContain(text);
    }
    expect(html).not.toMatch(/Tahrirlash|O‘chirish|Kimga|tahrir/);
  });

  it("shows a waiting campaign's countdown control in Russian", () => {
    const scheduled = NOTIFICATION_HISTORY.find((r) => r.state === "scheduled")!;
    const html = panel(scheduled.id, "ru");
    expect(html).toContain(notificationsCopy.ru.panel.cancelSend);
    expect(html).toContain("Запланировано");
  });

  it("lists the templates with the order status names and language marks", () => {
    const html = render(createElement(TemplatesSection, { templates: STATUS_TEMPLATES }), "ru");
    expect(html).toContain(notificationsCopy.ru.templates.title);
    expect(html).toContain("В обработке");
    expect(html).toMatch(/Изменить шаблон «/);
  });

  it("renders the test devices card with the phone input in each language", () => {
    const html = render(
      createElement(TestDevicesCard, { devices: TEST_DEVICES, onChange: () => {} }),
      "en",
    );
    expect(html).toContain("Test devices");
    expect(html).toContain("No push");
    expect(html).toContain('data-picker="phone"');
    expect(html).toContain("Remove: Dilnoza iPhone");
    const empty = render(createElement(TestDevicesCard, { devices: [], onChange: () => {} }));
    expect(empty).toContain(notificationsCopy.uz.devices.empty);
  });
});
