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
  roles: { manager: "Menejer", staff: "Xodim", specialist: "Mutaxassis" },
  roleField: {
    label: "Rol",
    descriptions: {
      staff: "Kundalik boshqaruv panelidan foydalanadi.",
      manager: "Boshqaruv paneli va xodim hisoblarini boshqaradi.",
      specialist: "Faqat «Mening jadvalim»ga kiradi: o‘z jadvali, profili va hisobi.",
    },
    specialistInvite:
      "Hisob bilan birga qoralama mutaxassis profili yaratiladi. Uni Mutaxassislar bo‘limida to‘ldirib, e’lon qilasiz.",
    specialistFixed:
      "Mutaxassis hisobi menejer bo‘la olmaydi: kerak bo‘lsa, avval uni xodimga o‘tkazing.",
    superuserBlock: "Superadmin roli himoyalangan.",
  },
  specialistRole: {
    title: "Mutaxassis roli",
    toSpecialistText: "Hisob mutaxassisga o‘tkazilsa, faqat «Mening jadvalim»ga kiradi.",
    toStaffText:
      "Hisob xodimga qaytarilsa, boshqaruv paneliga kiradi; mutaxassis profili to‘xtatiladi.",
    toSpecialist: "Mutaxassisga o‘tkazish",
    toStaff: "Xodimga o‘tkazish",
    blocked: {
      self: "O‘z hisobingiz rolini o‘zgartira olmaysiz.",
      inactive: "Avval hisobni qayta faollashtiring.",
      superuser: "Superadmin hisobining rolini o‘zgartirib bo‘lmaydi.",
      opsConsole: "Avval operatsiyalar konsoliga kirish huquqini olib tashlang.",
    },
    confirmTitle: {
      specialist: "Hisobni mutaxassisga o‘tkazasizmi?",
      staff: "Hisobni xodimga o‘tkazasizmi?",
    },
    sessions: "Hisobning barcha sessiyalari darhol tugatiladi; u qayta kirishi kerak bo‘ladi.",
    consequences: {
      specialist: [
        "Hisob faqat «Mening jadvalim»ga kiradi; boshqaruv paneli yopiladi.",
        "Menejer huquqlari bo‘lsa, olib tashlanadi.",
        "Hisobning avvalgi profili bo‘lsa, o‘sha profil qayta ishlatiladi va e’lon qilinmagan holda qoladi: e’lon qilishdan oldin uni Mutaxassislar bo‘limida tekshiring. Profil bo‘lmasa, qoralama yaratiladi.",
      ],
      staff: [
        "Profil e’londan olinadi: yangi yozilishlar to‘xtaydi.",
        "Profil va qabullar tarixi shu hisobda qoladi.",
        "Kelgusi qabullar o‘z-o‘zidan o‘zgarmaydi: ularni xodimlar ko‘chirishi yoki bekor qilishi kerak.",
      ],
    },
    done: {
      specialist: "Hisob mutaxassisga o‘tkazildi",
      staff: "Hisob xodimga o‘tkazildi",
    },
    reviewProfile: "Profilni tekshirib, tayyor bo‘lgach Mutaxassislar bo‘limida e’lon qiling.",
    upcoming: (_n: number, shown: string) =>
      `To‘xtatilgan profilda ${shown} ta kelgusi qabul bor. Ularni ko‘chiring yoki bekor qiling.`,
    openAppointments: "Qabullarni ochish",
    openProfile: "Profilni ochish",
    close: "Yopish",
  },
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
    email: "Email",
    emailHint:
      "Kirish manzili. O‘zgartirilsa, hisob (va mutaxassis profili) o‘sha-o‘sha qoladi; eski parol havolalari bekor qilinadi.",
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
    invitedSpecialist: "Mutaxassis taklif qilindi",
    specialistDraft:
      "Qoralama profil yaratildi. Mutaxassislar bo‘limida uni to‘ldiring, klinika va xizmatlarni biriktiring va e’lon qiling.",
    openProfile: "Profilni ochish",
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
    roles: { manager: "Менеджер", staff: "Сотрудник", specialist: "Специалист" },
    roleField: {
      label: "Роль",
      descriptions: {
        staff: "Доступ к повседневной работе в панели.",
        manager: "Доступ к панели и управлению аккаунтами сотрудников.",
        specialist: "Только «Моё расписание»: своё расписание, профиль и аккаунт.",
      },
      specialistInvite:
        "Вместе с аккаунтом создаётся черновик профиля специалиста. Заполните и опубликуйте его в разделе «Специалисты».",
      specialistFixed:
        "Аккаунт специалиста не может быть менеджером: при необходимости сначала переведите его в сотрудники.",
      superuserBlock: "Роль суперадминистратора защищена.",
    },
    specialistRole: {
      title: "Роль специалиста",
      toSpecialistText: "После перевода в специалисты аккаунт видит только «Моё расписание».",
      toStaffText:
        "После перевода в сотрудники аккаунт получит доступ к панели; профиль специалиста будет приостановлен.",
      toSpecialist: "Перевести в специалисты",
      toStaff: "Перевести в сотрудники",
      blocked: {
        self: "Нельзя менять роль своего аккаунта.",
        inactive: "Сначала активируйте аккаунт снова.",
        superuser: "Роль суперадминистратора изменить нельзя.",
        opsConsole: "Сначала отзовите доступ к операционной консоли.",
      },
      confirmTitle: {
        specialist: "Перевести аккаунт в специалисты?",
        staff: "Перевести аккаунт в сотрудники?",
      },
      sessions: "Все сеансы аккаунта сразу завершатся; потребуется войти заново.",
      consequences: {
        specialist: [
          "Аккаунт получит доступ только к «Моему расписанию»; панель станет недоступна.",
          "Права менеджера, если они есть, будут сняты.",
          "Если у аккаунта уже был профиль, он будет использован снова и останется неопубликованным: проверьте его в разделе «Специалисты» перед публикацией. Если профиля нет, будет создан черновик.",
        ],
        staff: [
          "Профиль будет снят с публикации: новые записи прекратятся.",
          "Профиль и история приёмов останутся у этого аккаунта.",
          "Предстоящие приёмы сами не изменятся: сотрудникам нужно перенести или отменить их.",
        ],
      },
      done: {
        specialist: "Аккаунт переведён в специалисты",
        staff: "Аккаунт переведён в сотрудники",
      },
      reviewProfile:
        "Проверьте профиль и опубликуйте его в разделе «Специалисты», когда он будет готов.",
      upcoming: (n: number, shown: string) =>
        `У приостановленного профиля ${shown} ${pluralRu(n, ["предстоящий приём", "предстоящих приёма", "предстоящих приёмов"])}. Перенесите или отмените их.`,
      openAppointments: "Открыть приёмы",
      openProfile: "Открыть профиль",
      close: "Закрыть",
    },
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
      email: "Почта",
      emailHint:
        "Адрес для входа. При смене аккаунт (и профиль специалиста) остаётся тем же; прежние ссылки для пароля отзываются.",
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
      invitedSpecialist: "Специалист приглашён",
      specialistDraft:
        "Создан черновик профиля. В разделе «Специалисты» заполните его, назначьте клинику и услуги и опубликуйте.",
      openProfile: "Открыть профиль",
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
    roles: { manager: "Manager", staff: "Staff", specialist: "Specialist" },
    roleField: {
      label: "Role",
      descriptions: {
        staff: "Can use the admin panel for day-to-day work.",
        manager: "Can use the admin panel and manage staff accounts.",
        specialist: "Only My Schedule: their own schedule, profile and account.",
      },
      specialistInvite:
        "A draft specialist profile is created with the account. Complete and publish it in Specialists.",
      specialistFixed:
        "A Specialist account cannot be a manager: change it to Staff first if needed.",
      superuserBlock: "The superuser role is protected.",
    },
    specialistRole: {
      title: "Specialist role",
      toSpecialistText: "Once changed to Specialist, the account only sees My Schedule.",
      toStaffText:
        "Once changed to Staff, the account uses the admin panel; the specialist profile is paused.",
      toSpecialist: "Change to Specialist",
      toStaff: "Change to Staff",
      blocked: {
        self: "You cannot change the role of your own account.",
        inactive: "Reactivate the account first.",
        superuser: "The role of a superuser account cannot be changed.",
        opsConsole: "Revoke operations console access first.",
      },
      confirmTitle: {
        specialist: "Change this account to Specialist?",
        staff: "Change this account to Staff?",
      },
      sessions: "All sessions of the account end at once; they will need to sign in again.",
      consequences: {
        specialist: [
          "The account only has access to My Schedule; the admin panel closes.",
          "Manager permissions, if any, are removed.",
          "If the account already had a profile, that profile is reused and stays unpublished: review it in Specialists before republishing. Otherwise a draft profile is created.",
        ],
        staff: [
          "The profile is unpublished: new bookings stop.",
          "The profile and its appointment history stay on this account.",
          "Upcoming visits do not change by themselves: staff must reschedule or cancel them.",
        ],
      },
      done: {
        specialist: "Account changed to Specialist",
        staff: "Account changed to Staff",
      },
      reviewProfile: "Review the profile and publish it in Specialists when it is ready.",
      upcoming: (n: number, shown: string) =>
        `The paused profile has ${shown} upcoming ${pluralEn(n, ["visit", "visits"])}. Reschedule or cancel them.`,
      openAppointments: "Open appointments",
      openProfile: "Open profile",
      close: "Close",
    },
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
      email: "Email",
      emailHint:
        "The sign-in address. Changing it keeps the same account (and specialist profile); earlier password links are revoked.",
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
      invitedSpecialist: "Specialist invited",
      specialistDraft:
        "A draft profile was created. In Specialists, complete it, assign clinics and services, and publish it.",
      openProfile: "Open profile",
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
