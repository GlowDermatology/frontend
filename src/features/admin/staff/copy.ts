import { pluralEn, pluralRu } from "@/lib/format";
import type { CopySet } from "@/lib/i18n/copy";

/**
 * «Xodimlar» (contract §2.16, DESIGN §E): the board, the row badges, the invite / edit / reset
 * dialogs with the «Kirish usuli» choice, the confirmations and the shown-once credentials.
 * Uzbek labels are what the e2e suite reads.
 */
const uz = {
  title: "Xodimlar",
  eyebrow: (_count: number, shown: string, active: boolean) =>
    `${shown} ta ${active ? "faol" : "nofaol"} xodim`,
  noAccess: {
    title: "Ruxsat yo‘q",
    lead: "Xodimlarni faqat menejerlar boshqaradi. Kirish kerak bo‘lsa, menejerga murojaat qiling.",
  },
  add: "Yangi xodim",
  list: "Xodimlar ro‘yxati",
  table: "Xodimlar jadvali",
  columns: {
    staff: "Xodim",
    role: "Rol",
    lastLogin: "Oxirgi kirish",
    social: "Ijtimoiy kirish",
    created: "Yaratilgan",
    status: "Holat",
    actions: "Amallar",
  },
  you: "(siz)",
  neverSignedIn: "Hali kirmagan",
  none: "—",
  roles: { manager: "Menejer", staff: "Xodim" },
  status: { label: "Holat", active: "Faol", inactive: "Nofaol" },
  search: "Ism yoki email",
  pageSize: "Sahifadagi qatorlar",
  rows: (n: number) => `${n} ta qator`,
  empty: {
    title: "Xodim topilmadi",
    search: "Qidiruvni o‘zgartirib ko‘ring.",
    inactive: "Faolsizlantirilgan xodimlar shu yerda ko‘rinadi.",
    first: "«Yangi xodim» bilan birinchi hisobni yarating.",
  },
  badges: {
    mustChange: "Parol o‘rnatilmagan",
    mustChangeHint: "Xodim birinchi kirishda o‘z parolini o‘rnatishi kerak.",
    invitePending: "Havola yuborilgan",
    invitePendingHint: (until: string) => `Parol o‘rnatish havolasi ${until} gacha amal qiladi.`,
    inviteExpired: "Havola muddati o‘tgan",
    inviteExpiredHint: "Yangi havola yuboring yoki parolni tiklang.",
    mfa: "MFA yoqilgan",
    mfaHint: "Xodim kirishda autentifikator ilovasidagi kodni ham kiritadi.",
  },
  menu: {
    label: (name: string) => `${name} — amallar`,
    edit: "Tahrirlash",
    resetPassword: "Parolni tiklash",
    resendLink: "Havolani qayta yuborish",
    resetMfa: "MFA ni o‘chirish",
    deactivate: "Faolsizlantirish",
    reactivate: "Qayta faollashtirish",
  },
  resendBlocked: {
    self: "O‘zingizga havola «Parolni o‘zgartirish» sahifasidan so‘raladi.",
    inactive: "Nofaol hisobga havola yuborilmaydi: avval uni qayta faollashtiring.",
    emailUnavailable:
      "E-pochta orqali yuborish sozlanmagan: «Parolni tiklash» bilan vaqtinchalik parol bering.",
  },
  common: {
    cancel: "Bekor qilish",
    busy: "So‘rov bajarilmoqda: biroz kuting.",
    working: "Bajarilmoqda…",
    failed: "Amal bajarilmadi",
  },
  delivery: {
    legend: "Kirish usuli",
    hint: "Har qanday usulda xodim birinchi kirishda o‘z parolini o‘rnatadi.",
    options: {
      temporary_password: {
        label: "Vaqtinchalik parol",
        description: "Parol bir marta ko‘rsatiladi — uni xodimga shaxsan bering.",
      },
      email_link: {
        label: "Email orqali havola",
        description:
          "Xodim emailiga parol o‘rnatish havolasi yuboriladi; havola bir marta ishlaydi.",
      },
      both: {
        label: "Ikkalasi",
        description: "Vaqtinchalik parol ko‘rsatiladi va emailga havola ham yuboriladi.",
      },
    },
    emailUnavailable:
      "E-pochta orqali yuborish sozlanmagan: serverda email yoqilmaguncha vaqtinchalik paroldan foydalaning.",
  },
  invite: {
    title: "Yangi xodim",
    description: "Hisob darhol yaratiladi. Xodim birinchi kirishda o‘z parolini o‘rnatadi.",
    email: "Email",
    emailHint: "Xodim shu email bilan tizimga kiradi.",
    fullName: "To‘liq ism",
    submit: "Xodim qo‘shish",
    submitting: "Qo‘shilmoqda…",
  },
  manager: {
    label: "Menejer",
    hint: "Menejer xodimlarni qo‘shadi, faolsizlantiradi va parolini tiklaydi.",
    selfHint: "O‘zingizni menejerlikdan chiqara olmaysiz: buni boshqa menejer qila oladi.",
  },
  edit: {
    title: "Xodimni tahrirlash",
    fullName: "To‘liq ism",
    emailLocked: "Emailni o‘zgartirib bo‘lmaydi: kerak bo‘lsa, yangi xodim qo‘shing.",
    submit: "Saqlash",
    submitting: "Saqlanmoqda…",
    saved: "Xodim saqlandi",
  },
  reset: {
    title: "Parolni tiklaysizmi?",
    body: "Joriy parol bekor qilinadi va xodimning barcha sessiyalari tugatiladi. Bu amalni qaytarib bo‘lmaydi.",
    submit: "Parolni tiklash",
  },
  confirm: {
    deactivate: {
      title: "Xodimni faolsizlantirasizmi?",
      body: "Uning barcha sessiyalari darhol tugatiladi va u tizimga kira olmaydi (parol ham, Google/Facebook ham). Ochiq parol havolalari bekor qilinadi. Hisob, menejerlik va bog‘langan kirishlar qayta faollashtirish uchun saqlanadi.",
      action: "Faolsizlantirish",
      done: "Xodim faolsizlantirildi",
    },
    reactivate: {
      title: "Xodimni qayta faollashtirasizmi?",
      body: "Xodim yana o‘z paroli yoki bog‘langan hisobi bilan kira oladi.",
      action: "Qayta faollashtirish",
      done: "Xodim qayta faollashtirildi",
    },
    resend: {
      title: "Havolani qayta yuborasizmi?",
      body: "Xodim emailiga yangi parol o‘rnatish havolasi yuboriladi; oldingi havolalar bekor qilinadi. Parol va sessiyalar o‘zgarmaydi.",
      action: "Havolani yuborish",
      done: "Havola yuborildi",
    },
    resetMfa: {
      title: "MFA ni o‘chirasizmi?",
      body: "Xodimning ikki bosqichli himoyasi o‘chiriladi va barcha sessiyalari tugatiladi. Telefonini yo‘qotgan bo‘lsa shunday qiling; u Sozlamalarda MFA ni qayta yoqishi mumkin.",
      action: "MFA ni o‘chirish",
      done: "MFA o‘chirildi",
    },
  },
  credentials: {
    invited: "Xodim qo‘shildi",
    resetPassword: "Yangi vaqtinchalik parol",
    resetLink: "Parol tiklandi",
    resent: "Havola yuborildi",
    password: "Vaqtinchalik parol",
    copy: "Nusxa olish",
    copied: "Nusxalandi",
    copiedToast: "Parol nusxalandi",
    copyFailed: "Nusxa olib bo‘lmadi",
    copyFailedLead: "Parolni belgilab, qo‘lda nusxalang.",
    handOver: "Parolni xodimga shaxsan bering. Bu parol qayta ko‘rsatilmaydi.",
    activation:
      "Xodim bu parol bilan kirgach, darhol o‘z parolini o‘rnatadi — shundan keyin hisob to‘liq ishlaydi.",
    mustChange: "Birinchi kirishda parolni almashtirish majburiy.",
    linkSent: (email: string) => `Parol o‘rnatish havolasi ${email} manziliga yuborildi.`,
    linkQueued: (email: string) => `Havola ${email} manziliga yuborish uchun navbatga qo‘yildi.`,
    linkValid: (until: string) => `Havola ${until} gacha amal qiladi va bir marta ishlaydi.`,
    linkDemo: "Demo rejim: xat jo‘natilmadi.",
    linkActivation: "Xodim havola orqali parol o‘rnatgach, kira oladi.",
    noPassword: "Parolni ko‘rsatib bo‘lmadi. Parolni qayta tiklang.",
    done: "Tayyor",
  },
};

export const staffCopy = {
  uz,
  ru: {
    title: "Сотрудники",
    eyebrow: (count: number, shown: string, active: boolean) =>
      `${shown} ${
        active
          ? pluralRu(count, ["активный сотрудник", "активных сотрудника", "активных сотрудников"])
          : pluralRu(count, [
              "неактивный сотрудник",
              "неактивных сотрудника",
              "неактивных сотрудников",
            ])
      }`,
    noAccess: {
      title: "Нет доступа",
      lead: "Сотрудниками управляют только менеджеры. Если вам нужен доступ, обратитесь к менеджеру.",
    },
    add: "Новый сотрудник",
    list: "Список сотрудников",
    table: "Таблица сотрудников",
    columns: {
      staff: "Сотрудник",
      role: "Роль",
      lastLogin: "Последний вход",
      social: "Вход через соцсети",
      created: "Создан",
      status: "Статус",
      actions: "Действия",
    },
    you: "(вы)",
    neverSignedIn: "Ещё не входил",
    none: "—",
    roles: { manager: "Менеджер", staff: "Сотрудник" },
    status: { label: "Статус", active: "Активные", inactive: "Неактивные" },
    search: "Имя или почта",
    pageSize: "Строк на странице",
    rows: (n: number) => `${n} ${pluralRu(n, ["строка", "строки", "строк"])}`,
    empty: {
      title: "Сотрудники не найдены",
      search: "Попробуйте изменить запрос.",
      inactive: "Здесь появятся деактивированные сотрудники.",
      first: "Создайте первую учётную запись кнопкой «Новый сотрудник».",
    },
    badges: {
      mustChange: "Пароль не задан",
      mustChangeHint: "При первом входе сотрудник должен задать свой пароль.",
      invitePending: "Ссылка отправлена",
      invitePendingHint: (until: string) => `Ссылка для установки пароля действует до ${until}.`,
      inviteExpired: "Ссылка устарела",
      inviteExpiredHint: "Отправьте новую ссылку или сбросьте пароль.",
      mfa: "MFA включена",
      mfaHint: "При входе сотрудник вводит ещё и код из приложения-аутентификатора.",
    },
    menu: {
      label: (name: string) => `${name} — действия`,
      edit: "Изменить",
      resetPassword: "Сбросить пароль",
      resendLink: "Отправить ссылку повторно",
      resetMfa: "Отключить MFA",
      deactivate: "Деактивировать",
      reactivate: "Активировать снова",
    },
    resendBlocked: {
      self: "Ссылку для себя запросите на странице «Сменить пароль».",
      inactive: "Неактивной учётной записи ссылка не отправляется: сначала активируйте её снова.",
      emailUnavailable:
        "Отправка по электронной почте не настроена: выдайте временный пароль через «Сбросить пароль».",
    },
    common: {
      cancel: "Отмена",
      busy: "Запрос выполняется, подождите.",
      working: "Выполняется…",
      failed: "Действие не выполнено",
    },
    delivery: {
      legend: "Способ входа",
      hint: "При любом способе сотрудник при первом входе задаёт свой пароль.",
      options: {
        temporary_password: {
          label: "Временный пароль",
          description: "Пароль показывается один раз — передайте его сотруднику лично.",
        },
        email_link: {
          label: "Ссылка по почте",
          description:
            "На почту сотрудника придёт ссылка для установки пароля; она срабатывает один раз.",
        },
        both: {
          label: "Оба способа",
          description: "Будет показан временный пароль, а на почту также придёт ссылка.",
        },
      },
      emailUnavailable:
        "Отправка по электронной почте не настроена: пока её не включат на сервере, используйте временный пароль.",
    },
    invite: {
      title: "Новый сотрудник",
      description: "Учётная запись создаётся сразу. При первом входе сотрудник задаёт свой пароль.",
      email: "Почта",
      emailHint: "Сотрудник будет входить с этим адресом.",
      fullName: "Полное имя",
      submit: "Добавить сотрудника",
      submitting: "Добавление…",
    },
    manager: {
      label: "Менеджер",
      hint: "Менеджер добавляет и деактивирует сотрудников и сбрасывает их пароли.",
      selfHint: "Нельзя снять с себя роль менеджера: это может сделать другой менеджер.",
    },
    edit: {
      title: "Изменение сотрудника",
      fullName: "Полное имя",
      emailLocked: "Почту изменить нельзя: при необходимости добавьте нового сотрудника.",
      submit: "Сохранить",
      submitting: "Сохранение…",
      saved: "Сотрудник сохранён",
    },
    reset: {
      title: "Сбросить пароль?",
      body: "Текущий пароль перестанет действовать, а все сеансы сотрудника будут завершены. Это действие нельзя отменить.",
      submit: "Сбросить пароль",
    },
    confirm: {
      deactivate: {
        title: "Деактивировать сотрудника?",
        body: "Все его сеансы сразу завершатся, и он не сможет войти (ни по паролю, ни через Google/Facebook). Открытые ссылки для установки пароля будут отозваны. Учётная запись, роль менеджера и привязанные входы сохранятся для повторной активации.",
        action: "Деактивировать",
        done: "Сотрудник деактивирован",
      },
      reactivate: {
        title: "Активировать сотрудника снова?",
        body: "Сотрудник снова сможет входить со своим паролем или привязанной учётной записью.",
        action: "Активировать снова",
        done: "Сотрудник снова активен",
      },
      resend: {
        title: "Отправить ссылку повторно?",
        body: "На почту сотрудника придёт новая ссылка для установки пароля; прежние ссылки будут отозваны. Пароль и сеансы не изменятся.",
        action: "Отправить ссылку",
        done: "Ссылка отправлена",
      },
      resetMfa: {
        title: "Отключить MFA?",
        body: "Двухэтапная защита сотрудника будет отключена, а все его сеансы завершены. Делайте так, если он потерял телефон; включить MFA снова он сможет в настройках.",
        action: "Отключить MFA",
        done: "MFA отключена",
      },
    },
    credentials: {
      invited: "Сотрудник добавлен",
      resetPassword: "Новый временный пароль",
      resetLink: "Пароль сброшен",
      resent: "Ссылка отправлена",
      password: "Временный пароль",
      copy: "Копировать",
      copied: "Скопировано",
      copiedToast: "Пароль скопирован",
      copyFailed: "Не удалось скопировать",
      copyFailedLead: "Выделите пароль и скопируйте его вручную.",
      handOver: "Передайте пароль сотруднику лично. Повторно он не будет показан.",
      activation:
        "Войдя с этим паролем, сотрудник сразу задаст свой — после этого учётная запись заработает полностью.",
      mustChange: "При первом входе смена пароля обязательна.",
      linkSent: (email: string) => `Ссылка для установки пароля отправлена на ${email}.`,
      linkQueued: (email: string) => `Ссылка на ${email} поставлена в очередь на отправку.`,
      linkValid: (until: string) => `Ссылка действует до ${until} и срабатывает один раз.`,
      linkDemo: "Демо-режим: письмо не отправлялось.",
      linkActivation: "Задав пароль по ссылке, сотрудник сможет войти.",
      noPassword: "Не удалось показать пароль. Сбросьте пароль ещё раз.",
      done: "Готово",
    },
  },
  en: {
    title: "Staff",
    eyebrow: (count: number, shown: string, active: boolean) =>
      `${shown} ${active ? "active" : "inactive"} ${pluralEn(count, ["staff member", "staff members"])}`,
    noAccess: {
      title: "No access",
      lead: "Only managers manage staff. If you need access, contact a manager.",
    },
    add: "New staff member",
    list: "Staff list",
    table: "Staff table",
    columns: {
      staff: "Staff member",
      role: "Role",
      lastLogin: "Last sign-in",
      social: "Social sign-in",
      created: "Created",
      status: "Status",
      actions: "Actions",
    },
    you: "(you)",
    neverSignedIn: "Never signed in",
    none: "—",
    roles: { manager: "Manager", staff: "Staff" },
    status: { label: "Status", active: "Active", inactive: "Inactive" },
    search: "Name or email",
    pageSize: "Rows per page",
    rows: (n: number) => `${n} ${pluralEn(n, ["row", "rows"])}`,
    empty: {
      title: "No staff found",
      search: "Try a different search.",
      inactive: "Deactivated staff members appear here.",
      first: "Create the first account with “New staff member”.",
    },
    badges: {
      mustChange: "Password not set",
      mustChangeHint: "They must set their own password at the first sign-in.",
      invitePending: "Link sent",
      invitePendingHint: (until: string) => `The set-password link is valid until ${until}.`,
      inviteExpired: "Link expired",
      inviteExpiredHint: "Send a new link or reset the password.",
      mfa: "MFA on",
      mfaHint: "They also enter a code from their authenticator app when signing in.",
    },
    menu: {
      label: (name: string) => `${name} — actions`,
      edit: "Edit",
      resetPassword: "Reset password",
      resendLink: "Resend link",
      resetMfa: "Turn off MFA",
      deactivate: "Deactivate",
      reactivate: "Reactivate",
    },
    resendBlocked: {
      self: "Request a link for yourself on the “Change password” page.",
      inactive: "Links are not sent to inactive accounts: reactivate the account first.",
      emailUnavailable:
        "Sending by email is not set up: give a temporary password with “Reset password”.",
    },
    common: {
      cancel: "Cancel",
      busy: "The request is running, please wait.",
      working: "Working…",
      failed: "Action failed",
    },
    delivery: {
      legend: "How they sign in",
      hint: "Either way, they set their own password at the first sign-in.",
      options: {
        temporary_password: {
          label: "Temporary password",
          description: "Shown once — hand it to the staff member in person.",
        },
        email_link: {
          label: "Email link",
          description: "A link to set a password is sent to their email; it works once.",
        },
        both: {
          label: "Both",
          description: "A temporary password is shown and a link is emailed as well.",
        },
      },
      emailUnavailable:
        "Sending by email is not set up: use a temporary password until email is enabled on the server.",
    },
    invite: {
      title: "New staff member",
      description:
        "The account is created at once. They set their own password at the first sign-in.",
      email: "Email",
      emailHint: "They sign in with this email.",
      fullName: "Full name",
      submit: "Add staff member",
      submitting: "Adding…",
    },
    manager: {
      label: "Manager",
      hint: "Managers add and deactivate staff and reset their passwords.",
      selfHint: "You cannot remove your own manager role: another manager can do it.",
    },
    edit: {
      title: "Edit staff member",
      fullName: "Full name",
      emailLocked: "The email cannot be changed: add a new staff member if needed.",
      submit: "Save",
      submitting: "Saving…",
      saved: "Staff member saved",
    },
    reset: {
      title: "Reset the password?",
      body: "The current password stops working and every session of this staff member ends. This cannot be undone.",
      submit: "Reset password",
    },
    confirm: {
      deactivate: {
        title: "Deactivate this staff member?",
        body: "All their sessions end at once and they cannot sign in (neither with a password nor with Google/Facebook). Open set-password links are revoked. The account, manager role and linked sign-ins are kept for reactivation.",
        action: "Deactivate",
        done: "Staff member deactivated",
      },
      reactivate: {
        title: "Reactivate this staff member?",
        body: "They can sign in again with their password or linked account.",
        action: "Reactivate",
        done: "Staff member reactivated",
      },
      resend: {
        title: "Resend the link?",
        body: "A new set-password link is emailed to them; earlier links are revoked. The password and sessions stay as they are.",
        action: "Send link",
        done: "Link sent",
      },
      resetMfa: {
        title: "Turn off MFA?",
        body: "Their two-step protection is turned off and all their sessions end. Do this if they lost their phone; they can turn MFA on again in Settings.",
        action: "Turn off MFA",
        done: "MFA turned off",
      },
    },
    credentials: {
      invited: "Staff member added",
      resetPassword: "New temporary password",
      resetLink: "Password reset",
      resent: "Link sent",
      password: "Temporary password",
      copy: "Copy",
      copied: "Copied",
      copiedToast: "Password copied",
      copyFailed: "Could not copy",
      copyFailedLead: "Select the password and copy it by hand.",
      handOver: "Hand the password to the staff member in person. It will not be shown again.",
      activation:
        "After signing in with it, they set their own password right away — then the account works fully.",
      mustChange: "Changing the password at the first sign-in is required.",
      linkSent: (email: string) => `A set-password link was sent to ${email}.`,
      linkQueued: (email: string) => `The link to ${email} is queued for sending.`,
      linkValid: (until: string) => `The link is valid until ${until} and works once.`,
      linkDemo: "Demo mode: no email was sent.",
      linkActivation: "Once they set a password with the link, they can sign in.",
      noPassword: "The password could not be shown. Reset the password again.",
      done: "Done",
    },
  },
} satisfies CopySet<typeof uz>;
