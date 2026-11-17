import { pluralEn, pluralRu } from "@/lib/format";
import type { CopySet } from "@/lib/i18n/copy";

/**
 * Texts of /admin/payments (uz / ru / en): the header, filters, table, refund operations and
 * their confirmation dialogs, toasts and the mock export headers. Status and refund-state names
 * come from `orderLabelsCopy` (`src/domain/copy/orders.ts`); the backend's refusals from
 * `paymentDataCopy`. Amounts arrive formatted for the language.
 */

const uz = {
  title: "To‘lovlar",
  count: (_n: number, shown: string) => `${shown} ta to‘lov`,
  found: (_n: number, shown: string) => `${shown} ta to‘lov topildi`,
  export: "Eksport",
  listLabel: "To‘lovlar ro‘yxati",
  tableLabel: "To‘lovlar jadvali",
  emptyTitle: "To‘lov topilmadi",
  emptyFiltered: "Qidiruv yoki filtrlarni o‘zgartirib ko‘ring.",
  emptyAll: "Mijozlar ilova yoki sayt orqali to‘laganda to‘lovlar shu yerda ko‘rinadi.",
  clearFilters: "Filtrlarni tozalash",

  toolbar: {
    search: "Buyurtma №, tranzaksiya yoki telefon",
    searchPlaceholder: "№, tranzaksiya yoki telefon",
    all: "Hammasi",
    status: "To‘lov holati",
    statusPrefix: "Holat:",
    provider: "To‘lov usuli",
    providerPrefix: "Usul:",
    refund: "Qaytarish holati",
    refundPrefix: "Qaytarish:",
    needsAction: "Harakat kerak",
    period: "Davr",
    periods: { today: "Bugun", week: "Oxirgi 7 kun", month: "Shu oy", all: "Barcha sana" },
    rows: "Sahifadagi qatorlar",
    rowsOption: (n: number) => `${n} ta qator`,
  },

  columns: {
    id: "ID",
    order: "Buyurtma",
    customer: "Mijoz",
    provider: "Usul",
    amount: "Summa, so‘m",
    status: "Holat",
    created: "Yaratilgan",
    refund: "Qaytarish",
    actions: "Amallar",
  },
  sortAscending: "eskisi birinchi — tartibni almashtirish",
  sortDescending: "yangisi birinchi — tartibni almashtirish",
  noRefund: "Qaytarish yo‘q",
  refundsTotal: (n: number) => `jami ${n} ta`,
  menuLabel: (order: number) => `Qaytarish amallari: №${order}`,

  items: {
    retry: "Qayta yuborish",
    close: "Yakunlash",
    payout: "Qo‘lda to‘landi",
    succeeded: "Qaytarildi deb belgilash",
    failed: "Bajarilmadi deb belgilash",
    busyReason: "Boshqa qaytarish amali bajarilmoqda — tugashini kuting.",
  },

  dialog: {
    retryTitle: "Qaytarishni qayta yuborasizmi?",
    retryClick: (order: number, amount: string) =>
      `Buyurtma №${order}: ${amount} uchun yangi qaytarish ochiladi va imkon bo‘lsa Click’ga yuboriladi; bo‘lmasa, mijozga qo‘lda to‘lash kerakligi ko‘rsatiladi.`,
    retryPayme: (order: number, amount: string) =>
      `Buyurtma №${order}: ${amount} uchun yangi qaytarish ochiladi; Payme kabinetida qo‘lda qaytariladi.`,
    retryConfirm: "Qayta yuborish",
    payoutTitle: "Mijozga qo‘lda to‘landimi?",
    payoutBody: (order: number, amount: string) =>
      `Buyurtma №${order}: ${amount} mijozga Click’dan tashqari to‘langanini tekshirdingizmi? Imkon bo‘lsa, Click holati yana tekshiriladi. Qaytarish «Qaytarildi» deb yopiladi va jurnalga «qo‘lda to‘landi» deb yoziladi.`,
    payoutConfirm: "Qo‘lda to‘landi",
    closeTitle: "Qaytarishni yakunlaysizmi?",
    closeBody: (order: number, amount: string) =>
      `Buyurtma №${order}: imkon bo‘lsa, to‘lov holati Click’dan qayta so‘raladi. Click ${amount} ni qaytargani tasdiqlansa, qaytarish «Qaytarildi» deb yopiladi va mijozga qo‘lda to‘lash kerak emas. Aks holda mijozga qo‘lda to‘lab, «Qo‘lda to‘landi» bilan yakunlaysiz.`,
    closeConfirm: "Yakunlash",
    succeededTitle: "Qaytarish bajarildimi?",
    checkManualClick: (amount: string) => `${amount} mijozga qo‘lda to‘langanini tekshirdingizmi?`,
    checkCabinet: (provider: string, amount: string) =>
      `${provider} kabinetida ${amount} mijozga qaytarilganini tekshirdingizmi?`,
    succeededBody: (order: number, check: string) =>
      `Buyurtma №${order}: ${check} Qaytarish «Qaytarildi» deb yopiladi.`,
    succeededConfirm: "Qaytarildi deb belgilash",
    failedTitle: "Qaytarish bajarilmadimi?",
    failedBody: (order: number, amount: string) =>
      `Buyurtma №${order}: ${amount} qaytarilmagan deb yopiladi. Keyin uni qayta yuborish mumkin.`,
    failedConfirm: "Bajarilmadi deb belgilash",
    paidByHand: (amount: string) => `Mijozga ${amount} qo‘lda to‘ladim`,
    back: "Orqaga",
    checkingClick: "Click tekshirilmoqda…",
    sending: "Yuborilmoqda…",
    busyReason: "So‘rov yuborilmoqda — javobni kuting.",
    tickFirst: "Avval mijozga qo‘lda to‘laganingizni belgilang (yuqoridagi katakcha).",
    /** Click did not answer the status check (503, §7 item 18). */
    unavailable:
      "Click javob bermadi: to‘lov holatini tekshirib bo‘lmadi. Qaytarish o‘zgarmadi — birozdan so‘ng qayta urinib ko‘ring.",
  },

  toast: {
    failed: "Amal bajarilmadi",
    order: (order: number) => `Buyurtma №${order}`,
    retried: "Qaytarish qayta yuborildi",
    closed: "Qaytarish yakunlandi",
    reversedByClick: (order: number) =>
      `Buyurtma №${order}: Click pulni mijozga qaytardi — qo‘lda to‘lash kerak emas.`,
    markedFailed: "Qaytarish bajarilmadi deb yopildi",
  },

  exportHeader: [
    "ID",
    "Buyurtma №",
    "Mijoz",
    "Telefon",
    "Usul",
    "Holat",
    "Summa (so‘m)",
    "Tranzaksiya",
    "Yaratilgan",
    "Tasdiqlangan",
    "Qaytarish",
  ],
};

export type PaymentsCopy = typeof uz;

export const paymentsCopy = {
  uz,
  ru: {
    title: "Платежи",
    count: (n: number, shown: string) =>
      `${shown} ${pluralRu(n, ["платёж", "платежа", "платежей"])}`,
    found: (n: number, shown: string) =>
      `${pluralRu(n, ["Найден", "Найдено", "Найдено"])} ${shown} ${pluralRu(n, ["платёж", "платежа", "платежей"])}`,
    export: "Экспорт",
    listLabel: "Список платежей",
    tableLabel: "Таблица платежей",
    emptyTitle: "Платежи не найдены",
    emptyFiltered: "Измените поиск или фильтры.",
    emptyAll:
      "Здесь появятся платежи, когда клиенты начнут оплачивать заказы в приложении или на сайте.",
    clearFilters: "Сбросить фильтры",

    toolbar: {
      search: "№ заказа, транзакция или телефон",
      searchPlaceholder: "№, транзакция или телефон",
      all: "Все",
      status: "Статус платежа",
      statusPrefix: "Статус:",
      provider: "Способ оплаты",
      providerPrefix: "Способ:",
      refund: "Статус возврата",
      refundPrefix: "Возврат:",
      needsAction: "Требует действий",
      period: "Период",
      periods: {
        today: "Сегодня",
        week: "Последние 7 дней",
        month: "Этот месяц",
        all: "За всё время",
      },
      rows: "Строк на странице",
      rowsOption: (n: number) => `${n} строк`,
    },

    columns: {
      id: "ID",
      order: "Заказ",
      customer: "Клиент",
      provider: "Способ",
      amount: "Сумма, сум",
      status: "Статус",
      created: "Создан",
      refund: "Возврат",
      actions: "Действия",
    },
    sortAscending: "сначала старые — изменить порядок",
    sortDescending: "сначала новые — изменить порядок",
    noRefund: "Возврата нет",
    refundsTotal: (n: number) => `всего ${n}`,
    menuLabel: (order: number) => `Действия с возвратом: №${order}`,

    items: {
      retry: "Отправить повторно",
      close: "Завершить",
      payout: "Выплачено вручную",
      succeeded: "Отметить как возвращённый",
      failed: "Отметить как невыполненный",
      busyReason: "Выполняется другая операция с возвратом — дождитесь её окончания.",
    },

    dialog: {
      retryTitle: "Отправить возврат повторно?",
      retryClick: (order: number, amount: string) =>
        `Заказ №${order}: будет открыт новый возврат на ${amount}. Если получится, он уйдёт в Click; если нет — появится отметка, что клиенту нужно выплатить вручную.`,
      retryPayme: (order: number, amount: string) =>
        `Заказ №${order}: будет открыт новый возврат на ${amount}; его нужно провести вручную в кабинете Payme.`,
      retryConfirm: "Отправить повторно",
      payoutTitle: "Деньги выплачены клиенту вручную?",
      payoutBody: (order: number, amount: string) =>
        `Заказ №${order}: вы проверили, что ${amount} выплачены клиенту в обход Click? Если получится, статус в Click будет проверен ещё раз. Возврат закроется как «Возвращён», а в журнал запишется «выплачено вручную».`,
      payoutConfirm: "Выплачено вручную",
      closeTitle: "Завершить возврат?",
      closeBody: (order: number, amount: string) =>
        `Заказ №${order}: если получится, статус платежа будет заново запрошен у Click. Если Click подтвердит, что вернул ${amount}, возврат закроется как «Возвращён» и выплачивать вручную не нужно. Иначе выплатите клиенту вручную и завершите кнопкой «Выплачено вручную».`,
      closeConfirm: "Завершить",
      succeededTitle: "Возврат выполнен?",
      checkManualClick: (amount: string) =>
        `вы проверили, что ${amount} выплачены клиенту вручную?`,
      checkCabinet: (provider: string, amount: string) =>
        `вы проверили в кабинете ${provider}, что ${amount} возвращены клиенту?`,
      succeededBody: (order: number, check: string) =>
        `Заказ №${order}: ${check} Возврат закроется как «Возвращён».`,
      succeededConfirm: "Отметить как возвращённый",
      failedTitle: "Возврат не выполнен?",
      failedBody: (order: number, amount: string) =>
        `Заказ №${order}: возврат ${amount} закроется как невыполненный. Потом его можно отправить повторно.`,
      failedConfirm: "Отметить как невыполненный",
      paidByHand: (amount: string) => `Я выплатил(а) клиенту ${amount} вручную`,
      back: "Назад",
      checkingClick: "Проверяем Click…",
      sending: "Отправляем…",
      busyReason: "Запрос отправляется — дождитесь ответа.",
      tickFirst: "Сначала отметьте выше, что выплатили клиенту вручную.",
      unavailable:
        "Click не ответил: статус платежа проверить не удалось. Возврат не изменился — попробуйте ещё раз чуть позже.",
    },

    toast: {
      failed: "Действие не выполнено",
      order: (order: number) => `Заказ №${order}`,
      retried: "Возврат отправлен повторно",
      closed: "Возврат завершён",
      reversedByClick: (order: number) =>
        `Заказ №${order}: Click вернул деньги клиенту — выплачивать вручную не нужно.`,
      markedFailed: "Возврат закрыт как невыполненный",
    },

    exportHeader: [
      "ID",
      "№ заказа",
      "Клиент",
      "Телефон",
      "Способ",
      "Статус",
      "Сумма (сум)",
      "Транзакция",
      "Создан",
      "Подтверждён",
      "Возврат",
    ],
  },
  en: {
    title: "Payments",
    count: (n: number, shown: string) => `${shown} ${pluralEn(n, ["payment", "payments"])}`,
    found: (n: number, shown: string) => `${shown} ${pluralEn(n, ["payment", "payments"])} found`,
    export: "Export",
    listLabel: "Payment list",
    tableLabel: "Payments table",
    emptyTitle: "No payments found",
    emptyFiltered: "Try changing the search or the filters.",
    emptyAll: "Payments appear here once customers pay for orders in the app or on the website.",
    clearFilters: "Clear filters",

    toolbar: {
      search: "Order No., transaction or phone",
      searchPlaceholder: "No., transaction or phone",
      all: "All",
      status: "Payment status",
      statusPrefix: "Status:",
      provider: "Payment method",
      providerPrefix: "Method:",
      refund: "Refund status",
      refundPrefix: "Refund:",
      needsAction: "Needs action",
      period: "Period",
      periods: { today: "Today", week: "Last 7 days", month: "This month", all: "All dates" },
      rows: "Rows per page",
      rowsOption: (n: number) => `${n} rows`,
    },

    columns: {
      id: "ID",
      order: "Order",
      customer: "Customer",
      provider: "Method",
      amount: "Amount, UZS",
      status: "Status",
      created: "Created",
      refund: "Refund",
      actions: "Actions",
    },
    sortAscending: "oldest first — change the order",
    sortDescending: "newest first — change the order",
    noRefund: "No refund",
    refundsTotal: (n: number) => `${n} in total`,
    menuLabel: (order: number) => `Refund actions: No. ${order}`,

    items: {
      retry: "Send again",
      close: "Close",
      payout: "Paid by hand",
      succeeded: "Mark as refunded",
      failed: "Mark as failed",
      busyReason: "Another refund operation is running — wait for it to finish.",
    },

    dialog: {
      retryTitle: "Send the refund again?",
      retryClick: (order: number, amount: string) =>
        `Order No. ${order}: a new refund of ${amount} is opened and, if possible, sent to Click; otherwise the row shows that the customer must be paid by hand.`,
      retryPayme: (order: number, amount: string) =>
        `Order No. ${order}: a new refund of ${amount} is opened; it is refunded by hand in the Payme merchant cabinet.`,
      retryConfirm: "Send again",
      payoutTitle: "Was the customer paid by hand?",
      payoutBody: (order: number, amount: string) =>
        `Order No. ${order}: have you checked that ${amount} was paid to the customer outside Click? If possible, the Click status is checked once more. The refund is closed as “Refunded” and the audit log records “paid by hand”.`,
      payoutConfirm: "Paid by hand",
      closeTitle: "Close the refund?",
      closeBody: (order: number, amount: string) =>
        `Order No. ${order}: if possible, the payment status is requested from Click again. If Click confirms it returned ${amount}, the refund is closed as “Refunded” and nobody has to pay the customer by hand. Otherwise pay the customer by hand and finish with “Paid by hand”.`,
      closeConfirm: "Close",
      succeededTitle: "Was the refund made?",
      checkManualClick: (amount: string) =>
        `have you checked that ${amount} was paid to the customer by hand?`,
      checkCabinet: (provider: string, amount: string) =>
        `have you checked in the ${provider} cabinet that ${amount} was returned to the customer?`,
      succeededBody: (order: number, check: string) =>
        `Order No. ${order}: ${check} The refund is closed as “Refunded”.`,
      succeededConfirm: "Mark as refunded",
      failedTitle: "Did the refund fail?",
      failedBody: (order: number, amount: string) =>
        `Order No. ${order}: the refund of ${amount} is closed as not made. You can send it again later.`,
      failedConfirm: "Mark as failed",
      paidByHand: (amount: string) => `I paid the customer ${amount} by hand`,
      back: "Back",
      checkingClick: "Checking Click…",
      sending: "Sending…",
      busyReason: "The request is being sent — wait for the answer.",
      tickFirst: "First confirm above that you paid the customer by hand.",
      unavailable:
        "Click did not answer: the payment status could not be checked. The refund did not change — try again in a moment.",
    },

    toast: {
      failed: "The action failed",
      order: (order: number) => `Order No. ${order}`,
      retried: "Refund sent again",
      closed: "Refund closed",
      reversedByClick: (order: number) =>
        `Order No. ${order}: Click returned the money to the customer — no payment by hand is needed.`,
      markedFailed: "Refund closed as failed",
    },

    exportHeader: [
      "ID",
      "Order No.",
      "Customer",
      "Phone",
      "Method",
      "Status",
      "Amount (UZS)",
      "Transaction",
      "Created",
      "Confirmed",
      "Refund",
    ],
  },
} satisfies CopySet<typeof uz>;
