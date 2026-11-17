import { createFormatter, pluralEn, pluralRu } from "@/lib/format";
import type { CopySet } from "@/lib/i18n/copy";

/**
 * Push campaign words outside the screens (contract §2.8), in uz / ru / en: the kind and state
 * names, the audience words of a history row, the push image rules, the composer / Server Action
 * schema messages and the mock backend's refusals (Uzbek = the backend's own texts, so the demo
 * answers like the API). Campaign titles, bodies and segment names are content: never translated.
 */
const uzN = createFormatter("uz").number;
const ruN = createFormatter("ru").number;
const enN = createFormatter("en").number;

const uz = {
  kind: { promo: "Aksiya", general: "Umumiy" },
  state: {
    draft: "Qoralama",
    tested: "Test tasdiqlangan",
    scheduled: "Rejalashtirilgan",
    sending: "Yuborilmoqda",
    stopping: "To‘xtatilmoqda",
    sent: "Yuborildi",
    partially_sent: "Qisman yuborildi",
    cancelled: "Bekor qilindi",
    failed: "Yuborilmadi",
  },
  /** "Barcha · 4 751", "Doimiy mijozlar · 612", "Bitta mijoz · +998 90 123 45 67". */
  audience: { all: "Barcha", group: "Guruh", one: "Bitta mijoz" },
  imageType: "Faqat JPEG, PNG yoki WebP rasm.",
  imageTooLarge: "Rasm 5 MB dan oshmasin.",
  schema: {
    titleMin: "Sarlavhani kiriting (kamida 3 belgi).",
    bodyMin: "Xabar matnini kiriting.",
    chooseLink: "Havolani tanlang.",
    linkUrlRequired: "Havolani kiriting.",
    linkUrlHttps: "Havolani https:// bilan to‘liq kiriting.",
    chooseGroup: "Guruhni tanlang.",
    phone: "Telefon raqamni +998 XX XXX XX XX ko‘rinishida kiriting.",
    futureTime: "Kelajakdagi vaqtni tanlang.",
    chooseTime: "Yuborish vaqtini tanlang.",
    chooseDevice: "Qurilmani tanlang.",
    devicesMin: "Kamida bitta qurilmani tanlang.",
    devicesMax: (max: number) => `Ko‘pi bilan ${uzN(max)} ta qurilma.`,
    badRequest: "Noto‘g‘ri so‘rov.",
    deviceLabelMin: "Qurilma nomini kiriting.",
    placeholders: (allowed: string, found: string) =>
      `Faqat ${allowed} o‘rinbosari ishlatiladi (${found} ishlamaydi).`,
  },
  /** The mock backend's answers (`notifications/services.py` module constants). */
  backend: {
    sendStarted: "Yuborish boshlangan: xabarni bekor qilib bo‘lmaydi.",
    staleRevision: "Xabar o‘zgartirilgan: sahifani yangilab, qayta urinib ko‘ring.",
    notTested: "Avval test yuboring va qurilmada ko‘rganingizni tasdiqlang.",
    notEditable: "Faqat qoralamani o‘zgartirish mumkin.",
    cancelDraft: "Qoralamani bekor qilish shart emas: uni o‘chiring yoki o‘zgartiring.",
    notSending: "Xabar hozir yuborilmayapti: to‘xtatadigan narsa yo‘q.",
    notReturnable:
      "Faqat rejalashtirilgan yoki bekor qilingan xabarni qoralamaga qaytarish mumkin.",
    testStale: "Bu test eski matn uchun yuborilgan: qayta test yuboring.",
    testUndelivered: "Bu test qurilmaga yetib bormagan: tasdiqlab bo‘lmaydi.",
    noTestDevices: "Push qabul qila oladigan test qurilmasi tanlanmadi.",
    customerNotFound: "Bu raqam bilan mijoz topilmadi.",
    deviceNotPushable: "Bu mijozning push yoqilgan qurilmasi yo‘q.",
    deviceRegistered: "Bu qurilma allaqachon ro‘yxatda.",
    notFound: "Topilmadi.",
    groupNotFound: "Guruh topilmadi.",
    checkFields: "Maydonlarni tekshiring.",
    placeholder: (placeholder: string) => `Faqat ${placeholder} o‘rinbosari ishlatiladi.`,
    productFallback: (id: string) => `Mahsulot #${id}`,
  },
};

export type NotificationDataCopy = typeof uz;

export const notificationDataCopy = {
  uz,
  ru: {
    kind: { promo: "Акция", general: "Общее" },
    state: {
      draft: "Черновик",
      tested: "Тест подтверждён",
      scheduled: "Запланировано",
      sending: "Отправляется",
      stopping: "Останавливается",
      sent: "Отправлено",
      partially_sent: "Отправлено частично",
      cancelled: "Отменено",
      failed: "Не отправлено",
    },
    audience: { all: "Все", group: "Группа", one: "Один клиент" },
    imageType: "Только изображения JPEG, PNG или WebP.",
    imageTooLarge: "Изображение не больше 5 МБ.",
    schema: {
      titleMin: "Введите заголовок (не менее 3 символов).",
      bodyMin: "Введите текст сообщения.",
      chooseLink: "Выберите, что откроется по нажатию.",
      linkUrlRequired: "Введите ссылку.",
      linkUrlHttps: "Введите полную ссылку, начинающуюся с https://.",
      chooseGroup: "Выберите группу.",
      phone: "Введите номер в формате +998 XX XXX XX XX.",
      futureTime: "Выберите время в будущем.",
      chooseTime: "Выберите время отправки.",
      chooseDevice: "Выберите устройство.",
      devicesMin: "Выберите хотя бы одно устройство.",
      devicesMax: (max: number) =>
        `Не более ${ruN(max)} ${pluralRu(max, ["устройства", "устройств", "устройств"])}.`,
      badRequest: "Неверный запрос.",
      deviceLabelMin: "Введите название устройства.",
      placeholders: (allowed: string, found: string) =>
        `Можно использовать только подстановку ${allowed} (${found} не работает).`,
    },
    backend: {
      sendStarted: "Отправка уже началась: рассылку нельзя отменить.",
      staleRevision: "Рассылку изменили: обновите страницу и попробуйте снова.",
      notTested: "Сначала отправьте тест и подтвердите, что увидели его на устройстве.",
      notEditable: "Изменить можно только черновик.",
      cancelDraft: "Черновик не нужно отменять: удалите или измените его.",
      notSending: "Рассылка сейчас не отправляется: останавливать нечего.",
      notReturnable: "Вернуть в черновики можно только запланированную или отменённую рассылку.",
      testStale: "Этот тест отправлен для старой версии текста: отправьте тест заново.",
      testUndelivered: "Этот тест не дошёл до устройства: подтвердить его нельзя.",
      noTestDevices: "Не выбрано тестовое устройство, способное принять push.",
      customerNotFound: "Клиент с этим номером не найден.",
      deviceNotPushable: "У этого клиента нет устройства с включёнными push-уведомлениями.",
      deviceRegistered: "Это устройство уже в списке.",
      notFound: "Не найдено.",
      groupNotFound: "Группа не найдена.",
      checkFields: "Проверьте поля.",
      placeholder: (placeholder: string) => `Можно использовать только подстановку ${placeholder}.`,
      productFallback: (id: string) => `Товар #${id}`,
    },
  },
  en: {
    kind: { promo: "Promotion", general: "General" },
    state: {
      draft: "Draft",
      tested: "Test confirmed",
      scheduled: "Scheduled",
      sending: "Sending",
      stopping: "Stopping",
      sent: "Sent",
      partially_sent: "Partially sent",
      cancelled: "Cancelled",
      failed: "Not sent",
    },
    audience: { all: "Everyone", group: "Group", one: "One customer" },
    imageType: "JPEG, PNG or WebP images only.",
    imageTooLarge: "The image must not exceed 5 MB.",
    schema: {
      titleMin: "Enter a title (at least 3 characters).",
      bodyMin: "Enter the message text.",
      chooseLink: "Choose what opens on tap.",
      linkUrlRequired: "Enter the link.",
      linkUrlHttps: "Enter a full link starting with https://.",
      chooseGroup: "Choose a group.",
      phone: "Enter the number as +998 XX XXX XX XX.",
      futureTime: "Choose a time in the future.",
      chooseTime: "Choose the send time.",
      chooseDevice: "Choose a device.",
      devicesMin: "Choose at least one device.",
      devicesMax: (max: number) =>
        `No more than ${enN(max)} ${pluralEn(max, ["device", "devices"])}.`,
      badRequest: "Invalid request.",
      deviceLabelMin: "Enter the device name.",
      placeholders: (allowed: string, found: string) =>
        `Only the ${allowed} placeholder can be used (${found} does not work).`,
    },
    backend: {
      sendStarted: "The send has started: the campaign can no longer be cancelled.",
      staleRevision: "The campaign was changed: reload the page and try again.",
      notTested: "Send a test first and confirm that you saw it on the device.",
      notEditable: "Only a draft can be changed.",
      cancelDraft: "A draft does not need cancelling: delete or edit it instead.",
      notSending: "The campaign is not sending right now: there is nothing to stop.",
      notReturnable: "Only a scheduled or cancelled campaign can go back to draft.",
      testStale: "This test was sent for an older version of the text: send a new test.",
      testUndelivered: "This test did not reach the device: it cannot be confirmed.",
      noTestDevices: "No test device that can receive a push was chosen.",
      customerNotFound: "No customer with this number was found.",
      deviceNotPushable: "This customer has no device with push notifications on.",
      deviceRegistered: "This device is already on the list.",
      notFound: "Not found.",
      groupNotFound: "Group not found.",
      checkFields: "Check the fields.",
      placeholder: (placeholder: string) => `Only the ${placeholder} placeholder can be used.`,
      productFallback: (id: string) => `Product #${id}`,
    },
  },
} satisfies CopySet<typeof uz>;
