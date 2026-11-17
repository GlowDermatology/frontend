import type { CopySet } from "@/lib/i18n/copy";

/**
 * Payments domain words in uz / ru / en: the backend's refund refusals the board recognises (by
 * their first words, in every admin language the API answers in), the messages of the mock
 * backend, and the payments export refusal. Uzbek is the source language and matches the
 * backend's texts (`commerce/services.py`); the Russian and English texts are what the mock
 * answers and what the board also recognises (DESIGN §G: the API answers in `Accept-Language`).
 */

const uz = {
  /** `MESSAGE_REFUND_STILL_PAID` (409 `click_not_reversed`, before M3 `invalid_transition`). */
  clickStillPaid:
    "Click to‘lovni qaytarmagan. Avval mijozga qo‘lda to‘lang, so‘ng «qo‘lda to‘landi» belgisi bilan yakunlang yoki qaytarishni qayta urinib ko‘ring.",
  /** `MESSAGE_REFUND_NO_PAYDOC` (409 `conflict`, M3). */
  clickNoPaydoc:
    "Bu to‘lovda Click to‘lov raqami yo‘q, shuning uchun Click’dan holatini tekshirib bo‘lmaydi. Mijozga qo‘lda to‘lang, so‘ng «qo‘lda to‘landi» belgisi bilan yakunlang.",
  /** `MESSAGE_REFUND_CLICK_FAKE` (409 `invalid_transition`). */
  clickFakeMode:
    "Click sinov rejimida: to‘lov holatini tekshirib bo‘lmaydi. Click ulanganidan keyin yakunlang.",
  /** `MESSAGE_ORDER_BUSY` (409 `conflict`, transient). */
  orderBusy: "Buyurtma boshqa amal bilan band. Birozdan so‘ng qayta urinib ko‘ring.",
  refundOpen: "Bu to‘lov uchun qaytarish allaqachon jarayonda.",
  notRetryable: "Bu qaytarishni qayta yuborib bo‘lmaydi.",
  notResolvable: "Bu qaytarishni yakunlab bo‘lmaydi.",
  notFound: "Topilmadi.",
  /** The export refusal of the screen-level "needs action" refund filter. */
  exportRefused: "Bu ko‘rinishni eksport qilib bo‘lmaydi.",
};

export type PaymentDataCopy = typeof uz;

export const paymentDataCopy = {
  uz,
  ru: {
    clickStillPaid:
      "Click не вернул платёж. Сначала выплатите клиенту деньги вручную, затем закройте возврат с отметкой «выплачено вручную» или повторите возврат.",
    clickNoPaydoc:
      "У этого платежа нет номера платежа Click, поэтому проверить его статус в Click нельзя. Выплатите клиенту деньги вручную, затем закройте возврат с отметкой «выплачено вручную».",
    clickFakeMode:
      "Click работает в тестовом режиме: статус платежа проверить нельзя. Закройте возврат после подключения Click.",
    orderBusy: "Заказ занят другой операцией. Повторите попытку чуть позже.",
    refundOpen: "Возврат по этому платежу уже выполняется.",
    notRetryable: "Этот возврат нельзя отправить повторно.",
    notResolvable: "Этот возврат нельзя закрыть.",
    notFound: "Не найдено.",
    exportRefused: "Этот вид списка нельзя выгрузить.",
  },
  en: {
    clickStillPaid:
      "Click has not reversed the payment. First pay the customer by hand, then close the refund marked “paid by hand”, or retry the refund.",
    clickNoPaydoc:
      "This payment has no Click payment ID, so its status cannot be checked with Click. Pay the customer by hand, then close the refund marked “paid by hand”.",
    clickFakeMode:
      "Click is in test mode: the payment status cannot be checked. Close the refund once Click is connected.",
    orderBusy: "The order is busy with another operation. Try again in a moment.",
    refundOpen: "A refund of this payment is already in progress.",
    notRetryable: "This refund cannot be sent again.",
    notResolvable: "This refund cannot be closed.",
    notFound: "Not found.",
    exportRefused: "This view cannot be exported.",
  },
} satisfies CopySet<typeof uz>;
