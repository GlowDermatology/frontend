import { createFormatter, pluralEn, pluralRu } from "@/lib/format";
import type { CopySet } from "@/lib/i18n/copy";

/**
 * Customer group texts outside the screens (contract §2.8): the rules in words, the form schema
 * messages, the Server Action refusals and the mock backend's answers (backend parity), in
 * uz / ru / en. Amounts and limits arrive formatted in the admin language (`shown`). Group names and customer data are never translated.
 */
const uzN = createFormatter("uz").number;
const ruN = createFormatter("ru").number;
const enN = createFormatter("en").number;

const uz = {
  rules: {
    /** `kamida 3 ta onlayn buyurtma` */
    minOrders: (n: number) => `kamida ${uzN(n)} ta onlayn buyurtma`,
    /** `jami xaridlar 10 mln so‘mdan` */
    minAmount: (amount: string) => `jami xaridlar ${amount} so‘mdan`,
    join: " va ",
    manualOnly: "Faqat qo‘lda qo‘shilgan mijozlar",
  },
  schema: {
    orders: "Buyurtmalar sonini kiriting (1 yoki ko‘p).",
    amount: "Summani kiriting (1 so‘mdan ko‘p).",
    max: (shown: string) => `Qiymat ${shown} dan oshmasin.`,
  },
  actions: {
    notFound: "Guruh topilmadi.",
    checkFields: "Maydonlarni tekshiring.",
    membersRequired: "Mijoz ID yoki telefon raqamini kiriting.",
    membersMax: (shown: string) => `Ko‘pi bilan ${shown} ta.`,
    rowIncomplete: "Telefonni to‘liq kiriting.",
    rowInvalid: "ID yoki telefon raqamini to‘g‘ri kiriting.",
    rowTooLong: "Juda uzun.",
  },
  mock: {
    nameTaken: "Bu qiymat band.",
    scheduled: "Rejalashtirilgan xabar bu guruhga yuboriladi.",
    idNotFound: "Topilmadi.",
    phoneNotFound: "Bu raqam bilan mijoz topilmadi.",
    memberNotFound: "Topilmadi.",
    ruleMember: "Mijoz guruhga qoida orqali kiradi.",
  },
  /** A paste longer than the limit. */
  dropped: (shown: string, max: string) => `${shown} ta qator qo‘shilmadi: ko‘pi bilan ${max} ta.`,
};

export const segmentCopy = {
  uz,
  ru: {
    rules: {
      minOrders: (n: number) =>
        `не менее ${ruN(n)} ${pluralRu(n, ["онлайн-заказа", "онлайн-заказов", "онлайн-заказов"])}`,
      minAmount: (amount: string) => `покупки на сумму от ${amount} сум`,
      join: " и ",
      manualOnly: "Только клиенты, добавленные вручную",
    },
    schema: {
      orders: "Укажите число заказов (1 или больше).",
      amount: "Укажите сумму (больше 1 сума).",
      max: (shown: string) => `Значение не должно превышать ${shown}.`,
    },
    actions: {
      notFound: "Группа не найдена.",
      checkFields: "Проверьте поля.",
      membersRequired: "Введите ID клиента или номер телефона.",
      membersMax: (shown: string) => `Не более ${shown}.`,
      rowIncomplete: "Введите телефон полностью.",
      rowInvalid: "Введите корректный ID или номер телефона.",
      rowTooLong: "Слишком длинно.",
    },
    mock: {
      nameTaken: "Это значение уже занято.",
      scheduled: "Этой группе адресована запланированная рассылка.",
      idNotFound: "Не найдено.",
      phoneNotFound: "Клиент с этим номером не найден.",
      memberNotFound: "Не найдено.",
      ruleMember: "Клиент входит в группу по правилу.",
    },
    dropped: (shown: string, max: string) => `Не добавлено строк: ${shown} — не более ${max}.`,
  },
  en: {
    rules: {
      minOrders: (n: number) =>
        `at least ${enN(n)} ${pluralEn(n, ["online order", "online orders"])}`,
      minAmount: (amount: string) => `purchases of ${amount} UZS or more`,
      join: " and ",
      manualOnly: "Manually added customers only",
    },
    schema: {
      orders: "Enter the number of orders (1 or more).",
      amount: "Enter an amount (more than 1 UZS).",
      max: (shown: string) => `The value must not exceed ${shown}.`,
    },
    actions: {
      notFound: "Group not found.",
      checkFields: "Check the fields.",
      membersRequired: "Enter a customer ID or phone number.",
      membersMax: (shown: string) => `${shown} at most.`,
      rowIncomplete: "Enter the whole phone number.",
      rowInvalid: "Enter a valid ID or phone number.",
      rowTooLong: "Too long.",
    },
    mock: {
      nameTaken: "This value is already taken.",
      scheduled: "A scheduled campaign targets this group.",
      idNotFound: "Not found.",
      phoneNotFound: "No customer with this number.",
      memberNotFound: "Not found.",
      ruleMember: "The customer is in the group by a rule.",
    },
    dropped: (shown: string, max: string) => `${shown} lines not added: ${max} at most.`,
  },
} satisfies CopySet<typeof uz>;

export type SegmentCopy = (typeof segmentCopy)["uz"];
