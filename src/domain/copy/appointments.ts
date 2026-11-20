import type { CopySet } from "@/lib/i18n/copy";

/**
 * Messages of the appointment data layer (DESIGN §G): the booking schemas shared by the dialogs
 * and the Server Actions, the actions' own refusals and the mock branch's imitation of the
 * backend's answers (`src/data/mock/appointments.actions.ts`). Uzbek is the source language and
 * matches the backend's texts.
 */
const uz = {
  chooseSpecialist: "Mutaxassisni tanlang.",
  chooseClinic: "Qabul uchun klinikani tanlang.",
  wrongClinic: "Mutaxassis bu kuni ushbu klinikada ishlamaydi.",
  chooseService: "Xizmatni tanlang.",
  chooseDate: "Sanani tanlang.",
  chooseTime: "Vaqtni tanlang.",
  timeStep: (step: number) => `Vaqt ${step} daqiqalik qadamda bo‘lsin.`,
  phone: "Telefon raqamini to‘g‘ri kiriting.",
  maxChars: (max: number) => `${max} belgidan oshmasin.`,
  requestKey: "Noto‘g‘ri so‘rov kaliti.",
  notFound: "Qabul topilmadi.",
  specialistNotFound: "Mutaxassis topilmadi.",
  serviceNotFound: "Xizmat topilmadi.",
  invalidTransition: "Bu amal ushbu holatda mumkin emas.",
  checkFields: "Maydonlarni tekshiring.",
  serviceNotOffered: "Mutaxassis bu xizmatni ko‘rsatmaydi.",
  customerNotFound: "Bu raqam bilan mijoz topilmadi.",
  inPast: "Kelajakdagi vaqtni tanlang.",
  outsideWorkingHours: "Mutaxassis bu vaqtda ishlamaydi.",
  slotUnavailable: "Bu vaqt band.",
};

export const appointmentDataCopy = {
  uz,
  ru: {
    chooseSpecialist: "Выберите специалиста.",
    chooseClinic: "Выберите клинику для приёма.",
    wrongClinic: "В этот день специалист не работает в этой клинике.",
    chooseService: "Выберите услугу.",
    chooseDate: "Выберите дату.",
    chooseTime: "Выберите время.",
    timeStep: (step: number) => `Время должно быть кратно ${step} минутам.`,
    phone: "Введите правильный номер телефона.",
    maxChars: (max: number) => `Не более ${max} символов.`,
    requestKey: "Неверный ключ запроса.",
    notFound: "Приём не найден.",
    specialistNotFound: "Специалист не найден.",
    serviceNotFound: "Услуга не найдена.",
    invalidTransition: "Это действие недоступно в текущем статусе.",
    checkFields: "Проверьте поля.",
    serviceNotOffered: "Специалист не оказывает эту услугу.",
    customerNotFound: "Клиент с этим номером не найден.",
    inPast: "Выберите время в будущем.",
    outsideWorkingHours: "Специалист в это время не работает.",
    slotUnavailable: "Это время занято.",
  },
  en: {
    chooseSpecialist: "Choose a specialist.",
    chooseClinic: "Choose a clinic for the appointment.",
    wrongClinic: "The specialist does not work at this clinic on that day.",
    chooseService: "Choose a service.",
    chooseDate: "Choose a date.",
    chooseTime: "Choose a time.",
    timeStep: (step: number) => `The time must be on a ${step}-minute step.`,
    phone: "Enter a valid phone number.",
    maxChars: (max: number) => `No more than ${max} characters.`,
    requestKey: "Invalid request key.",
    notFound: "Appointment not found.",
    specialistNotFound: "Specialist not found.",
    serviceNotFound: "Service not found.",
    invalidTransition: "This action is not available in the current status.",
    checkFields: "Check the fields.",
    serviceNotOffered: "The specialist does not offer this service.",
    customerNotFound: "No customer with this number.",
    inPast: "Choose a time in the future.",
    outsideWorkingHours: "The specialist does not work at this time.",
    slotUnavailable: "This time is taken.",
  },
} satisfies CopySet<typeof uz>;

export type AppointmentDataCopy = (typeof appointmentDataCopy)["uz"];
