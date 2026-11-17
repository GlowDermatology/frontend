import type { CopySet } from "@/lib/i18n/copy";

/**
 * Customer domain words in uz / ru / en: device platforms, list orderings and statuses, the
 * deleted-customer label, and the messages of the customers data layer (the cashback adjustment
 * schema, the Server Actions and the mock backend). Uzbek is the source language and matches the
 * backend's texts.
 */

const uz = {
  platform: { ios: "iOS", android: "Android", web: "Veb-sayt" },
  status: { active: "Faol", deleted: "O‘chirilgan" },
  deleted: "O‘chirilgan mijoz",
  sort: {
    registered_desc: "Avval yangilari",
    registered_asc: "Avval eskilari",
    name_asc: "Ism: A–Z",
    name_desc: "Ism: Z–A",
    total_desc: "Xaridlar: ko‘pdan",
    total_asc: "Xaridlar: kamdan",
    balance_desc: "Balans: ko‘pdan",
    balance_asc: "Balans: kamdan",
  },

  /* the cashback adjustment (zod), the Server Actions and the mock backend */
  chooseDirection: "Amalni tanlang.",
  enterAmount: "Summani kiriting.",
  amountTooLarge: "Summa juda katta.",
  checkFields: "Maydonlarni tekshiring.",
  customerNotFound: "Mijoz topilmadi.",
  sessionNotFound: "Seans allaqachon tugagan yoki topilmadi.",
  /** `insufficient_balance` (contract §2.6): the top-level message and the `amount` one. */
  balanceNegative: "Balans manfiy bo‘lib qoladi.",
  subtractTooMuch: "Balansdan ko‘p ayirib bo‘lmaydi.",
};

export type CustomerDataCopy = typeof uz;

export const customerDataCopy = {
  uz,
  ru: {
    platform: { ios: "iOS", android: "Android", web: "Веб-сайт" },
    status: { active: "Активен", deleted: "Удалён" },
    deleted: "Удалённый клиент",
    sort: {
      registered_desc: "Сначала новые",
      registered_asc: "Сначала старые",
      name_asc: "Имя: А–Я",
      name_desc: "Имя: Я–А",
      total_desc: "Покупки: по убыванию",
      total_asc: "Покупки: по возрастанию",
      balance_desc: "Баланс: по убыванию",
      balance_asc: "Баланс: по возрастанию",
    },

    chooseDirection: "Выберите действие.",
    enterAmount: "Укажите сумму.",
    amountTooLarge: "Слишком большая сумма.",
    checkFields: "Проверьте поля.",
    customerNotFound: "Клиент не найден.",
    sessionNotFound: "Сессия уже завершена или не найдена.",
    balanceNegative: "Баланс станет отрицательным.",
    subtractTooMuch: "Нельзя списать больше, чем есть на балансе.",
  },
  en: {
    platform: { ios: "iOS", android: "Android", web: "Website" },
    status: { active: "Active", deleted: "Deleted" },
    deleted: "Deleted customer",
    sort: {
      registered_desc: "Newest first",
      registered_asc: "Oldest first",
      name_asc: "Name: A–Z",
      name_desc: "Name: Z–A",
      total_desc: "Purchases: highest first",
      total_asc: "Purchases: lowest first",
      balance_desc: "Balance: highest first",
      balance_asc: "Balance: lowest first",
    },

    chooseDirection: "Choose an action.",
    enterAmount: "Enter an amount.",
    amountTooLarge: "The amount is too large.",
    checkFields: "Check the fields.",
    customerNotFound: "Customer not found.",
    sessionNotFound: "The session has already ended or was not found.",
    balanceNegative: "The balance would become negative.",
    subtractTooMuch: "You cannot subtract more than the balance.",
  },
} satisfies CopySet<typeof uz>;
