import type { CopySet } from "@/lib/i18n/copy";

/**
 * Cashback domain words in uz / ru / en: the policy version history (summary, period, author),
 * the save warnings, the ledger's source and note, and the messages of the cashback data layer
 * (the policy draft schema, the Server Action, the mock backend). Uzbek is the source language
 * and matches the backend's §5.4 texts. Amounts and dates arrive formatted for the language.
 */

const uz = {
  /** `RANGE(t)` "30–50 mln" (from without its unit, to with it). */
  range: (from: string, to: string) => `${from}–${to}`,
  /** An open top: "50 mln dan". */
  openRange: (from: string) => `${from} dan`,
  upTo: (to: string, percent: string) => `${to} gacha ${percent}%`,
  band: (range: string, percent: string) => `${range}: ${percent}%`,
  initial: (parts: string) => `Boshlang‘ich: ${parts}`,
  bandAdded: (band: string) => `${band} qo‘shildi`,
  tierRemoved: "Daraja olib tashlandi",
  tiersUpdated: "Darajalar yangilandi",
  rulesUpdated: "Hisoblash qoidalari yangilandi",
  periodFrom: (day: string) => `${day} dan`,
  superseded: "almashtirildi",
  /** The author of a version made by the system (seed, migration). */
  system: "Tizim",
  newVersion: "Yangi versiya",
  warningGap: (from: string, to: string) => `${from} – ${to} so‘m oralig‘i uchun foiz yo‘q.`,
  warningAbove: (from: string) => `${from} so‘mdan yuqori xaridlar uchun foiz belgilanmagan.`,

  ledger: {
    order: (ref: string) => `Buyurtma №${ref}`,
    billzSale: (ref: string) => `Billz savdo ${ref}`,
    /** The adjusting staff member when the API names none. */
    admin: "Administrator",
    base: (amount: string, percent: string) => `${amount} so‘m · ${percent}%`,
    receipt: (base: string) => `Chek ${base}`,
    promoExcluded: (base: string) => `${base} · aksiyasiz qism`,
    debit: "To‘lovning bir qismi",
    reversal: "Buyurtma bekor qilindi · cashback qaytarildi",
  },

  /* the policy draft (zod) and the Server Action */
  decimals: "Ko‘pi bilan 2 ta kasr raqam.",
  integer: "Butun son kiriting.",
  notNegative: "Qiymat 0 dan kam bo‘lmasin.",
  enterPercent: "Foizni kiriting.",
  percentPositive: "Foiz 0 dan katta bo‘lsin.",
  percentMax: "Foiz 100 dan oshmasin.",
  chooseEffective: "Kuchga kirish sanasini tanlang.",
  maxTiers: "Ko‘pi bilan 20 ta daraja.",
  checkTiers: "Darajalarni tekshiring.",
  needTier: "Kamida bitta daraja kerak.",
  overlap: "Darajalar ustma-ust tushmoqda.",
  badKey: "Noto‘g‘ri so‘rov kaliti.",
};

export type CashbackDataCopy = typeof uz;

export const cashbackDataCopy = {
  uz,
  ru: {
    range: (from: string, to: string) => `${from}–${to}`,
    openRange: (from: string) => `от ${from}`,
    upTo: (to: string, percent: string) => `до ${to} — ${percent}%`,
    band: (range: string, percent: string) => `${range}: ${percent}%`,
    initial: (parts: string) => `Начальная: ${parts}`,
    bandAdded: (band: string) => `добавлен уровень ${band}`,
    tierRemoved: "Уровень удалён",
    tiersUpdated: "Уровни обновлены",
    rulesUpdated: "Правила начисления обновлены",
    periodFrom: (day: string) => `с ${day}`,
    superseded: "заменена",
    system: "Система",
    newVersion: "Новая версия",
    warningGap: (from: string, to: string) => `Для диапазона ${from} – ${to} сум процент не задан.`,
    warningAbove: (from: string) => `Для покупок свыше ${from} сум процент не задан.`,

    ledger: {
      order: (ref: string) => `Заказ №${ref}`,
      billzSale: (ref: string) => `Продажа Billz ${ref}`,
      admin: "Администратор",
      base: (amount: string, percent: string) => `${amount} сум · ${percent}%`,
      receipt: (base: string) => `Чек ${base}`,
      promoExcluded: (base: string) => `${base} · без акционных товаров`,
      debit: "Часть оплаты",
      reversal: "Заказ отменён · кешбэк возвращён",
    },

    decimals: "Не больше 2 знаков после запятой.",
    integer: "Введите целое число.",
    notNegative: "Значение не меньше 0.",
    enterPercent: "Укажите процент.",
    percentPositive: "Процент должен быть больше 0.",
    percentMax: "Процент не больше 100.",
    chooseEffective: "Выберите дату вступления в силу.",
    maxTiers: "Не больше 20 уровней.",
    checkTiers: "Проверьте уровни.",
    needTier: "Нужен хотя бы один уровень.",
    overlap: "Уровни пересекаются.",
    badKey: "Неверный ключ запроса.",
  },
  en: {
    range: (from: string, to: string) => `${from}–${to}`,
    openRange: (from: string) => `${from} and above`,
    upTo: (to: string, percent: string) => `up to ${to}: ${percent}%`,
    band: (range: string, percent: string) => `${range}: ${percent}%`,
    initial: (parts: string) => `Initial: ${parts}`,
    bandAdded: (band: string) => `${band} added`,
    tierRemoved: "Tier removed",
    tiersUpdated: "Tiers updated",
    rulesUpdated: "Calculation rules updated",
    periodFrom: (day: string) => `from ${day}`,
    superseded: "replaced",
    system: "System",
    newVersion: "New version",
    warningGap: (from: string, to: string) => `No rate is set for ${from} – ${to} UZS.`,
    warningAbove: (from: string) => `No rate is set for purchases above ${from} UZS.`,

    ledger: {
      order: (ref: string) => `Order No. ${ref}`,
      billzSale: (ref: string) => `Billz sale ${ref}`,
      admin: "Administrator",
      base: (amount: string, percent: string) => `${amount} UZS · ${percent}%`,
      receipt: (base: string) => `Receipt ${base}`,
      promoExcluded: (base: string) => `${base} · excluding promo items`,
      debit: "Part of the payment",
      reversal: "Order cancelled · cashback reversed",
    },

    decimals: "No more than 2 decimal places.",
    integer: "Enter a whole number.",
    notNegative: "Must be at least 0.",
    enterPercent: "Enter a percent.",
    percentPositive: "The percent must be greater than 0.",
    percentMax: "The percent must not exceed 100.",
    chooseEffective: "Choose the effective date.",
    maxTiers: "No more than 20 tiers.",
    checkTiers: "Check the tiers.",
    needTier: "At least one tier is needed.",
    overlap: "The tiers overlap.",
    badKey: "Invalid request key.",
  },
} satisfies CopySet<typeof uz>;
