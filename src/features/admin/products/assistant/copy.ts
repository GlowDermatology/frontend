import { pluralEn, pluralRu } from "@/lib/format";
import type { CopySet } from "@/lib/i18n/copy";

/**
 * The AI assistant of the product editor in the admin languages: the header menu, the ✨ button
 * next to each field, the note under a field the AI wrote, and the banner. The AI's texts
 * themselves are product content (in the product's languages) and are never translated.
 */
const uz = {
  button: "AI yordamchi",
  buttonRunning: "AI yozmoqda…",
  fill: {
    label: "Bo‘sh maydonlarni to‘ldirish",
    hint: (n: number) =>
      `AI barcha bo‘sh matnlarni uch tilda, kiritilgan ma’lumotlar asosida yozadi (${n} ta maydon).`,
    none: "Hamma maydonlar allaqachon to‘ldirilgan",
    needName: "Avval mahsulot nomini kamida bitta tilda kiriting",
  },
  improve: {
    label: "Barcha matnlarni yaxshilash",
    hint: "To‘ldirilgan tavsiflar, qo‘llash usuli va SEO matnlarini tushunarliroq va chiroyliroq qilib qayta yozadi.",
    none: "Yaxshilash uchun matn yo‘q — avval tavsif yozing",
  },
  photos: {
    label: "Rasmdan aniqlash",
    hint: "Qadoq rasmidan nom, tarkib va qo‘llash usulini o‘qiydi. Bo‘sh maydonlarni to‘ldiradi, to‘ldirilganlari uchun variant taklif qiladi.",
    none: "Avval mahsulot rasmini qo‘shing va saqlang",
  },
  field: {
    write: "AI bu matnni yozadi",
    rewrite: "AI bu matnni yaxshiroq qilib qayta yozadi",
    writeAria: (label: string) => `AI yozadi: ${label}`,
    rewriteAria: (label: string) => `AI qayta yozadi: ${label}`,
    wait: "AI allaqachon yozmoqda — kuting",
    needSource: "Avval bu maydonni boshqa tilda to‘ldiring — AI uni tarjima qiladi",
  },
  note: {
    title: "AI matni — tekshiring va saqlang",
    undo: "Avvalgidek qaytarish",
    again: "Boshqa variant",
    insert: "Qo‘yish",
  },
  banner: {
    filled: (n: number) =>
      `AI ${n} ta maydonga matn yozdi — ular ajratib ko‘rsatilgan. Tekshiring va «Saqlash»ni bosing.`,
    extracted: ({ brand, volume }: { brand?: string; volume?: string }) =>
      `Qadoqdan: ${[brand && `brend — ${brand}`, volume && `hajm — ${volume}`].filter(Boolean).join(", ")}. Bu maydonlarni o‘zingiz tekshiring.`,
    nothing: "AI hech bir maydonni o‘zgartirmadi.",
    notChanged: "Bu maydonlar o‘zgarmadi:",
    undoAll: "Hammasini bekor qilish",
    dismiss: "Yopish",
  },
  nothingToFill: "Bu yerda to‘ldiradigan narsa yo‘q — hamma maydonlar to‘ldirilgan",
  reasons: {
    unchanged: "AI o‘zgartirmadi: matn allaqachon yaxshi",
    skipped:
      "AI’ga mahsulot haqida ma’lumot yetmadi. Kamida bitta tilda tavsif yoki tarkibni kiriting va qayta urinib ko‘ring.",
    review: "AI boshqa matn taklif qiladi — o‘qib chiqing va kerak bo‘lsa «Qo‘yish»ni bosing.",
    nothingToDo: "AI bu yerga yoza olmaydi: avval mahsulot nomini kiriting",
    edited: "AI yozayotganda maydonni o‘zgartirdingiz — matn qo‘yilmadi",
    factAdded: "Taklif rad etildi: AI ma’lumotlarda yo‘q faktni qo‘shdi",
    posLabel: "Taklif rad etildi: AI Billz’dagi ombor nomini ko‘chirdi",
    tooLong: "Taklif rad etildi: matn juda uzun chiqdi",
    empty: "AI bo‘sh matn qaytardi — qayta urinib ko‘ring",
    fallback: "AI bu safar matn yoza olmadi. Qayta urinib ko‘ring yoki ko‘proq ma’lumot kiriting.",
  },
  warnings: {
    unsupported_claim:
      "Tekshiring: AI ma’lumotlarda yo‘q xususiyatni yozdi (masalan, «gipoallergen»).",
    unverified_number: "Matndagi raqamlarni tekshiring — ular mahsulot ma’lumotlarida yo‘q.",
    inci_mismatch: "Tarkibni tekshiring: u boshqa tildagidan farq qiladi.",
    confirm_packaging: "Qadoq bilan solishtiring — matn rasmdan o‘qilgan.",
    seo_title_long: "Sarlavha 60 belgidan uzun — qidiruv tizimi uni qisqartirishi mumkin.",
    seo_description_long: "Tavsif 160 belgidan uzun — qidiruv tizimi uni qisqartirishi mumkin.",
  },
  toast: {
    failed: "AI matn yoza olmadi",
    retry: "Qayta urinish",
  },
  tabMarked: "AI matni bor",
  altLabel: (place: number, language: string) => `Rasm ${place} tavsifi · ${language}`,
  seoLabel: { title: "SEO sarlavha", description: "SEO tavsif" },
};

type AssistantCopy = typeof uz;

const ru: AssistantCopy = {
  button: "AI-помощник",
  buttonRunning: "AI пишет…",
  fill: {
    label: "Заполнить пустые поля",
    hint: (n: number) =>
      `AI напишет все пустые тексты на трёх языках по тому, что уже введено (${n} ${pluralRu(n, ["поле", "поля", "полей"])}).`,
    none: "Все поля уже заполнены",
    needName: "Сначала введите название товара хотя бы на одном языке",
  },
  improve: {
    label: "Улучшить все тексты",
    hint: "Перепишет заполненные описания, способ применения и SEO понятнее и аккуратнее.",
    none: "Нечего улучшать — сначала напишите описание",
  },
  photos: {
    label: "Распознать по фото",
    hint: "Прочитает с фото упаковки название, состав и способ применения. Пустые поля заполнит, для заполненных предложит вариант.",
    none: "Сначала добавьте фото товара и сохраните",
  },
  field: {
    write: "AI напишет этот текст",
    rewrite: "AI перепишет этот текст лучше",
    writeAria: (label: string) => `AI напишет: ${label}`,
    rewriteAria: (label: string) => `AI перепишет: ${label}`,
    wait: "AI уже пишет — подождите",
    needSource: "Сначала заполните это поле на другом языке — AI его переведёт",
  },
  note: {
    title: "Текст от AI — проверьте и сохраните",
    undo: "Вернуть как было",
    again: "Другой вариант",
    insert: "Вставить",
  },
  banner: {
    filled: (n: number) =>
      `AI написал текст для ${n} ${pluralRu(n, ["поля", "полей", "полей"])} — они подсвечены. Проверьте и нажмите «Сохранить».`,
    extracted: ({ brand, volume }: { brand?: string; volume?: string }) =>
      `С упаковки: ${[brand && `бренд — ${brand}`, volume && `объём — ${volume}`].filter(Boolean).join(", ")}. Проверьте эти поля сами.`,
    nothing: "AI не изменил ни одного поля.",
    notChanged: "Эти поля не изменились:",
    undoAll: "Отменить всё",
    dismiss: "Закрыть",
  },
  nothingToFill: "Здесь нечего заполнять — все поля уже заполнены",
  reasons: {
    unchanged: "AI не стал менять: текст уже хороший",
    skipped:
      "AI не хватило сведений о товаре. Добавьте описание или состав хотя бы на одном языке и попробуйте снова.",
    review: "AI предлагает другой текст — прочитайте его и, если подходит, нажмите «Вставить».",
    nothingToDo: "AI нечего написать здесь: сначала заполните название товара",
    edited: "Вы изменили поле, пока AI писал, — текст не вставлен",
    factAdded: "Предложение отклонено: AI добавил факт, которого нет в данных",
    posLabel: "Предложение отклонено: AI скопировал складское название из Billz",
    tooLong: "Предложение отклонено: текст получился слишком длинным",
    empty: "AI вернул пустой текст — попробуйте ещё раз",
    fallback:
      "В этот раз AI не смог написать текст. Попробуйте ещё раз или заполните больше полей.",
  },
  warnings: {
    unsupported_claim:
      "Проверьте: AI упомянул свойство, которого нет в данных (например, «гипоаллергенно»).",
    unverified_number: "Проверьте числа в тексте — их нет в данных товара.",
    inci_mismatch: "Проверьте состав: он отличается от другого языка.",
    confirm_packaging: "Сверьте с упаковкой — текст прочитан с фото.",
    seo_title_long: "Заголовок длиннее 60 символов — поисковик может его обрезать.",
    seo_description_long: "Описание длиннее 160 символов — поисковик может его обрезать.",
  },
  toast: {
    failed: "AI не смог написать текст",
    retry: "Повторить",
  },
  tabMarked: "есть текст от AI",
  altLabel: (place: number, language: string) => `Описание фото ${place} · ${language}`,
  seoLabel: { title: "SEO-заголовок", description: "SEO-описание" },
};

const en: AssistantCopy = {
  button: "AI assistant",
  buttonRunning: "AI is writing…",
  fill: {
    label: "Fill empty fields",
    hint: (n: number) =>
      `The AI writes every empty text in all three languages from what is already entered (${n} ${pluralEn(n, ["field", "fields"])}).`,
    none: "Every field is already filled in",
    needName: "Enter the product name in at least one language first",
  },
  improve: {
    label: "Improve all texts",
    hint: "Rewrites the filled descriptions, usage and SEO texts to be clearer and neater.",
    none: "Nothing to improve yet — write a description first",
  },
  photos: {
    label: "Read from photos",
    hint: "Reads the name, ingredients and usage from the packaging photo. Fills the empty fields and suggests a version for the filled ones.",
    none: "Add a product photo and save first",
  },
  field: {
    write: "The AI will write this text",
    rewrite: "The AI will rewrite this text better",
    writeAria: (label: string) => `AI writes: ${label}`,
    rewriteAria: (label: string) => `AI rewrites: ${label}`,
    wait: "The AI is already writing — please wait",
    needSource: "Fill this field in another language first — the AI will translate it",
  },
  note: {
    title: "Text by the AI — check it and save",
    undo: "Undo",
    again: "Another version",
    insert: "Insert",
  },
  banner: {
    filled: (n: number) =>
      `The AI wrote text for ${n} ${pluralEn(n, ["field", "fields"])} — they are highlighted. Check them and press “Save”.`,
    extracted: ({ brand, volume }: { brand?: string; volume?: string }) =>
      `From the packaging: ${[brand && `brand — ${brand}`, volume && `volume — ${volume}`].filter(Boolean).join(", ")}. Check these fields yourself.`,
    nothing: "The AI did not change any field.",
    notChanged: "These fields were not changed:",
    undoAll: "Undo all",
    dismiss: "Close",
  },
  nothingToFill: "Nothing to fill here — every field is already filled in",
  reasons: {
    unchanged: "The AI left it: the text is already good",
    skipped:
      "The AI did not have enough product details. Add a description or ingredients in at least one language and try again.",
    review: "The AI suggests a different text — read it and press “Insert” if it fits.",
    nothingToDo: "The AI has nothing to write here yet: enter the product name first",
    edited: "You changed the field while the AI was writing — the text was not inserted",
    factAdded: "Suggestion refused: the AI added a fact that is not in the data",
    posLabel: "Suggestion refused: the AI copied the Billz stock name",
    tooLong: "Suggestion refused: the text came out too long",
    empty: "The AI returned an empty text — try again",
    fallback: "The AI could not write a text this time. Try again or fill in more fields.",
  },
  warnings: {
    unsupported_claim:
      "Check: the AI mentioned a property that is not in the data (e.g. “hypoallergenic”).",
    unverified_number: "Check the numbers in the text — they are not in the product data.",
    inci_mismatch: "Check the ingredients: they differ from the other language.",
    confirm_packaging: "Check against the packaging — the text was read from the photo.",
    seo_title_long: "The title is over 60 characters — search engines may cut it.",
    seo_description_long: "The description is over 160 characters — search engines may cut it.",
  },
  toast: {
    failed: "The AI could not write the text",
    retry: "Try again",
  },
  tabMarked: "has AI text",
  altLabel: (place: number, language: string) => `Photo ${place} description · ${language}`,
  seoLabel: { title: "SEO title", description: "SEO description" },
};

export const assistantCopy = { uz, ru, en } satisfies CopySet<AssistantCopy>;

export type AssistantCopyT = AssistantCopy;
