import type { CopySet, Widen } from "./widen";

/** The notifications inbox. */
const uz = {
  title: "Xabarlar",
  lead: "Buyurtma va qabullar holati, aksiyalar va hisob xavfsizligi haqida.",
  empty: "Hozircha xabar yo‘q.",
  markAll: "Hammasini o‘qilgan deb belgilash",
  unread: (count: number) => `${count} ta o‘qilmagan`,
  allRead: "Hammasi o‘qilgan",
  newLabel: "Yangi",
  open: "Ochish",
  kinds: { promo: "Aksiya", general: "Xabar", order_status: "Buyurtma", appointment: "Qabul" },
};

type Copy = Widen<typeof uz>;

const ru: Copy = {
  title: "Сообщения",
  lead: "О статусе заказов и записей, акциях и безопасности аккаунта.",
  empty: "Сообщений пока нет.",
  markAll: "Отметить все как прочитанные",
  unread: (count) => `Непрочитанных: ${count}`,
  allRead: "Всё прочитано",
  newLabel: "Новое",
  open: "Открыть",
  kinds: { promo: "Акция", general: "Сообщение", order_status: "Заказ", appointment: "Запись" },
};

const en: Copy = {
  title: "Messages",
  lead: "Order and appointment updates, offers and account security.",
  empty: "No messages yet.",
  markAll: "Mark all as read",
  unread: (count) => `${count} unread`,
  allRead: "All read",
  newLabel: "New",
  open: "Open",
  kinds: { promo: "Offer", general: "Notice", order_status: "Order", appointment: "Appointment" },
};

export const inboxCopy = { uz, ru, en } satisfies CopySet<typeof uz>;
export type InboxCopy = Copy;
