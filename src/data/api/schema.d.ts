/* eslint-disable */
/**
 * GENERATED FILE — do not edit by hand. Regenerate with `npm run gen:api`.
 *
 * Source: openapi/schema.yaml of the backend repository
 * Commit: f7768e23d3b61f4a7ac57d81e04e8a4a9f4a386e
 * Generated: 2026-11-24T17:41:41.727Z (openapi-typescript)
 */

export interface paths {
    "/api/v1/admin/appointments/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["admin_appointments_day"];
        put?: never;
        /** @description Staff booking (requested_via=admin, created directly as confirmed). The slot must sit on a 5-minute grid in the future, inside the specialist's hours for that day (a date override wins), outside blocked periods and the recurring break, and must not overlap another open appointment (a concurrent booking of the same slot answers 409 conflict). */
        post: operations["admin_appointments_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/appointments/{id}/{action}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description confirm / reject (from requested) or attend (from confirmed); otherwise 409 invalid_transition. */
        post: operations["admin_appointments_action"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/appointments/{id}/cancel/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Cancel an open (requested|confirmed) appointment; the slot is freed and the customer is pushed. */
        post: operations["admin_appointments_cancel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/appointments/{id}/reschedule/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Move an open (requested|confirmed) appointment; the status is kept. Same slot rules as the creation. Moving to another specialist needs `service_id`, one of that specialist's active services; a changed service re-snapshots duration and price. */
        post: operations["admin_appointments_reschedule"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/appointments/meta/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description What the admin booking dialog offers: active specialists (by position, then name) with their active services (the duration and price a booking would snapshot) and the slot grid in minutes. */
        get: operations["admin_appointments_meta"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/appointments/pending-summary/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["admin_appointments_pending_summary"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/appointments/range/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description The week and month boards: per Tashkent day of `from`…`to` (inclusive) the status counts of the appointments starting that day, whether any listed specialist works and their combined hours. `detail=counts` (default) allows up to 42 days; `detail=full` (up to 7 days) adds every specialist's day schedule and the appointments in the day-item shape. Specialists follow the day board's rule over the whole range (active ones, plus inactive ones with an appointment in it); `specialist_id` narrows specialists, counts and appointments to one. */
        get: operations["admin_appointments_range"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/assistant/jobs/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["admin_assistant_jobs_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/assistant/jobs/{id}/accept/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Record which suggestions the person took into the (unsaved) product form. The product is not written — the person saves the form. `outcome` becomes `applied` (every suggestion), `partial` (some) or `discarded` (none); each key must be one of the job's suggestions. A job that is not a pending, succeeded one is a 409. */
        post: operations["admin_assistant_jobs_accept_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/assistant/jobs/{id}/apply/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Apply the selected suggestions (values may be edited; they are checked again). A key whose product value changed since the generation is returned in `conflicts` and not written. */
        post: operations["admin_assistant_jobs_apply_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/assistant/jobs/{id}/discard/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["admin_assistant_jobs_discard_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/assistant/status/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Whether the product editor shows the AI assistant (switched on and its provider ready). */
        get: operations["admin_assistant_status_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/audit-log/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @description ``?export=csv|xlsx`` of an admin list (contract 1.8).
         *
         *     ``export_name`` (the file name stem and the sheet title) and ``export_headers`` are Uzbek source texts:
         *     they are rendered with ``core.uzsource.tr`` in the request's ``Accept-Language``
         *     (``core.api.language.admin_language``), and ``get_export_rows`` runs with that language active, so the
         *     values it takes from ``core.labels.text`` (and ``yes_no``, ``active_label``, ``refund_state_label``)
         *     follow it. Data (names, ids, amounts, dates) is never translated; the ``export.downloaded`` audit row is
         *     written in Uzbek outside that scope.
         */
        get: operations["admin_audit_log_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/audit-log/facets/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description What the audit log shows the signed-in staff member: ordinary staff see business entries and their own sign-ins and exports, without IP addresses; managers add staff management and every staff sign-in, with IPs; superusers see everything. Entries outside the tier are simply absent from `audit-log/` and its export (a filter on them answers an empty list, never 403). */
        get: operations["admin_audit_log_facets"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/auth/change-password/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["admin_auth_change_password"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/auth/login/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Email + password sign-in. With the admin panel MFA on (feat/admin-ux) a correct password opens no session: the answer is `{mfa_required: true, challenge, challenge_expires_at}` and `auth/mfa/verify/` opens it. */
        post: operations["admin_auth_login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/auth/logout/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["admin_auth_logout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/auth/me/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["admin_auth_me"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** @description Change the caller's admin panel language (`uz`, `ru`, `en`); returns Me. Allowed while a password change is pending. */
        patch: operations["admin_auth_me_update"];
        trace?: never;
    };
    "/api/v1/admin/auth/mfa/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description The caller's admin panel MFA: on or off, and the unused recovery codes. */
        get: operations["admin_auth_mfa_status"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/auth/mfa/confirm/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Confirm the pending device with its first code: MFA is on, the current session counts as verified, and the ten recovery codes are returned once. Wrong code or not the caller's pending device → 400 `mfa_code_invalid`; already on → 409; 429 while the code lockout runs. */
        post: operations["admin_auth_mfa_confirm"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/auth/mfa/disable/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Turn the admin panel MFA off: the current password plus a code or a recovery code. Wrong password → 400 `password_incorrect`; wrong code → 400 `mfa_code_invalid`; off → 409. */
        post: operations["admin_auth_mfa_disable"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/auth/mfa/recovery-codes/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Ten new recovery codes (the old ones stop working), returned once: the current password plus a TOTP code. Errors as `auth/mfa/disable/`. */
        post: operations["admin_auth_mfa_recovery_codes"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/auth/mfa/setup/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Start enabling the admin panel MFA (re-enter the current password): a new pending TOTP device (an earlier pending one is replaced) as an `otpauth://` URI for the QR code and a manual key. Wrong password → 400 `password_incorrect` on `current_password` (the change-password lockout); already on → 409 `conflict`. */
        post: operations["admin_auth_mfa_setup"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/auth/mfa/verify/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Public (no bearer): the sign-in's second step. The challenge of `auth/login/` or `auth/oauth/{provider}/` plus exactly one of `code` / `recovery_code` → the normal sign-in answer (session `auth_method` = the first step's). Wrong code → 400 `mfa_code_invalid` (5 attempts per challenge); unknown, expired (5 min), used or exhausted challenge, or a password change / deactivation / MFA reset since → 400 `mfa_challenge_invalid` (sign in again); 429 while the account's code lockout runs or for the per-IP limit. */
        post: operations["admin_auth_mfa_verify"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/auth/oauth/{provider}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Staff social sign-in, allow-list only: Django exchanges the authorization code with the provider and signs in the staff member whose identity is already linked. Same response as auth/login/ (with the admin panel MFA on: the challenge for auth/mfa/verify/). */
        post: operations["admin_auth_oauth_login"];
        /** @description Unlink the caller's identity for the provider. */
        delete: operations["admin_auth_oauth_unlink"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/auth/oauth/{provider}/link/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Link the provider identity to the signed-in staff member (same body as the sign-in); returns Me with the updated linked_providers. */
        post: operations["admin_auth_oauth_link"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/auth/password-link/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description E-mail the caller a single-use link to set their password, for an account that must change it but cannot type the current one (signed in with a social identity, an e-mail-link account). 409 `conflict` when no change is pending or e-mail links are not available (`capabilities.staff_email_invite`); 5/hour. */
        post: operations["admin_auth_password_link"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/auth/password-token/check/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Public (no bearer): whose password link this is, for the set-password page. An unknown, used, revoked or expired link, or one of an inactive account → one uniform 400 `token_invalid`. */
        post: operations["admin_auth_password_token_check"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/auth/password-token/set/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Public (no bearer): set the password with a link (single use). The password is validated for the link's account (the change-password codes, `password_unchanged` for the current one); every session of the account is revoked and no new one is opened — the person signs in next. A bad link → 400 `token_invalid`. */
        post: operations["admin_auth_password_token_set"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/auth/refresh/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["admin_auth_refresh"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/banners/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @description ``?export=csv|xlsx`` of an admin list (contract 1.8).
         *
         *     ``export_name`` (the file name stem and the sheet title) and ``export_headers`` are Uzbek source texts:
         *     they are rendered with ``core.uzsource.tr`` in the request's ``Accept-Language``
         *     (``core.api.language.admin_language``), and ``get_export_rows`` runs with that language active, so the
         *     values it takes from ``core.labels.text`` (and ``yes_no``, ``active_label``, ``refund_state_label``)
         *     follow it. Data (names, ids, amounts, dates) is never translated; the ``export.downloaded`` audit row is
         *     written in Uzbek outside that scope.
         */
        get: operations["admin_banners_list"];
        put?: never;
        /** @description Multipart: `image` plus dotted keys `title.uz`, `link.kind`, … (BannerWriteSerializer). */
        post: operations["admin_banners_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/banners/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @description ``?export=csv|xlsx`` of an admin list (contract 1.8).
         *
         *     ``export_name`` (the file name stem and the sheet title) and ``export_headers`` are Uzbek source texts:
         *     they are rendered with ``core.uzsource.tr`` in the request's ``Accept-Language``
         *     (``core.api.language.admin_language``), and ``get_export_rows`` runs with that language active, so the
         *     values it takes from ``core.labels.text`` (and ``yes_no``, ``active_label``, ``refund_state_label``)
         *     follow it. Data (names, ids, amounts, dates) is never translated; the ``export.downloaded`` audit row is
         *     written in Uzbek outside that scope.
         */
        get: operations["admin_banners_retrieve"];
        put?: never;
        post?: never;
        /**
         * @description ``?export=csv|xlsx`` of an admin list (contract 1.8).
         *
         *     ``export_name`` (the file name stem and the sheet title) and ``export_headers`` are Uzbek source texts:
         *     they are rendered with ``core.uzsource.tr`` in the request's ``Accept-Language``
         *     (``core.api.language.admin_language``), and ``get_export_rows`` runs with that language active, so the
         *     values it takes from ``core.labels.text`` (and ``yes_no``, ``active_label``, ``refund_state_label``)
         *     follow it. Data (names, ids, amounts, dates) is never translated; the ``export.downloaded`` audit row is
         *     written in Uzbek outside that scope.
         */
        delete: operations["admin_banners_destroy"];
        options?: never;
        head?: never;
        /**
         * @description ``?export=csv|xlsx`` of an admin list (contract 1.8).
         *
         *     ``export_name`` (the file name stem and the sheet title) and ``export_headers`` are Uzbek source texts:
         *     they are rendered with ``core.uzsource.tr`` in the request's ``Accept-Language``
         *     (``core.api.language.admin_language``), and ``get_export_rows`` runs with that language active, so the
         *     values it takes from ``core.labels.text`` (and ``yes_no``, ``active_label``, ``refund_state_label``)
         *     follow it. Data (names, ids, amounts, dates) is never translated; the ``export.downloaded`` audit row is
         *     written in Uzbek outside that scope.
         */
        patch: operations["admin_banners_partial_update"];
        trace?: never;
    };
    "/api/v1/admin/banners/order/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * @description ``?export=csv|xlsx`` of an admin list (contract 1.8).
         *
         *     ``export_name`` (the file name stem and the sheet title) and ``export_headers`` are Uzbek source texts:
         *     they are rendered with ``core.uzsource.tr`` in the request's ``Accept-Language``
         *     (``core.api.language.admin_language``), and ``get_export_rows`` runs with that language active, so the
         *     values it takes from ``core.labels.text`` (and ``yes_no``, ``active_label``, ``refund_state_label``)
         *     follow it. Data (names, ids, amounts, dates) is never translated; the ``export.downloaded`` audit row is
         *     written in Uzbek outside that scope.
         */
        put: operations["admin_banners_reorder"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/cashback/policy-versions/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Appends a scheduled version. Tier errors use the submitted index (`tiers.{i}.from|to|percent`); gaps and an upper-bounded last tier are returned as `warnings`. A previously scheduled version becomes superseded (`superseded_version`). */
        post: operations["admin_cashback_policy_versions_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/cashback/policy/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description The active and the scheduled version (at most one each), every version newest first by `version` (superseded ones included) and `next_effective_from`, the start of the next Tashkent calendar month. */
        get: operations["admin_cashback_policy_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/categories/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @description ``?export=csv|xlsx`` of an admin list (contract 1.8).
         *
         *     ``export_name`` (the file name stem and the sheet title) and ``export_headers`` are Uzbek source texts:
         *     they are rendered with ``core.uzsource.tr`` in the request's ``Accept-Language``
         *     (``core.api.language.admin_language``), and ``get_export_rows`` runs with that language active, so the
         *     values it takes from ``core.labels.text`` (and ``yes_no``, ``active_label``, ``refund_state_label``)
         *     follow it. Data (names, ids, amounts, dates) is never translated; the ``export.downloaded`` audit row is
         *     written in Uzbek outside that scope.
         */
        get: operations["admin_categories_list"];
        put?: never;
        /** @description JSON, or multipart with dotted `name.uz`/`name.ru`/`name.en` and an optional `image` (JPEG, PNG or WebP, ≤ 5 MiB; re-encoded, EXIF stripped, ≤ 2400 px). */
        post: operations["admin_categories_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/categories/{slug}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @description ``?export=csv|xlsx`` of an admin list (contract 1.8).
         *
         *     ``export_name`` (the file name stem and the sheet title) and ``export_headers`` are Uzbek source texts:
         *     they are rendered with ``core.uzsource.tr`` in the request's ``Accept-Language``
         *     (``core.api.language.admin_language``), and ``get_export_rows`` runs with that language active, so the
         *     values it takes from ``core.labels.text`` (and ``yes_no``, ``active_label``, ``refund_state_label``)
         *     follow it. Data (names, ids, amounts, dates) is never translated; the ``export.downloaded`` audit row is
         *     written in Uzbek outside that scope.
         */
        get: operations["admin_categories_retrieve"];
        put?: never;
        post?: never;
        /**
         * @description ``?export=csv|xlsx`` of an admin list (contract 1.8).
         *
         *     ``export_name`` (the file name stem and the sheet title) and ``export_headers`` are Uzbek source texts:
         *     they are rendered with ``core.uzsource.tr`` in the request's ``Accept-Language``
         *     (``core.api.language.admin_language``), and ``get_export_rows`` runs with that language active, so the
         *     values it takes from ``core.labels.text`` (and ``yes_no``, ``active_label``, ``refund_state_label``)
         *     follow it. Data (names, ids, amounts, dates) is never translated; the ``export.downloaded`` audit row is
         *     written in Uzbek outside that scope.
         */
        delete: operations["admin_categories_destroy"];
        options?: never;
        head?: never;
        /** @description JSON or multipart (dotted names). A multipart `image` replaces the stored image (the old file is removed); `remove_image: true` drops it; both at once → `remove_image` `invalid`. */
        patch: operations["admin_categories_partial_update"];
        trace?: never;
    };
    "/api/v1/admin/categories/order/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * @description ``?export=csv|xlsx`` of an admin list (contract 1.8).
         *
         *     ``export_name`` (the file name stem and the sheet title) and ``export_headers`` are Uzbek source texts:
         *     they are rendered with ``core.uzsource.tr`` in the request's ``Accept-Language``
         *     (``core.api.language.admin_language``), and ``get_export_rows`` runs with that language active, so the
         *     values it takes from ``core.labels.text`` (and ``yes_no``, ``active_label``, ``refund_state_label``)
         *     follow it. Data (names, ids, amounts, dates) is never translated; the ``export.downloaded`` audit row is
         *     written in Uzbek outside that scope.
         */
        put: operations["admin_categories_reorder"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/clinics/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["admin_clinics_list"];
        put?: never;
        post: operations["admin_clinics_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/clinics/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["admin_clinics_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** @description Deactivate after reassigning active specialists and resolving upcoming visits. */
        patch: operations["admin_clinics_partial_update"];
        trace?: never;
    };
    "/api/v1/admin/customers/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description `search`: the name contains the term, or (≥ 3 digits) the phone contains its digits, or (≥ 3 characters) the e-mail address contains it. `segment`: segment membership (rules or manual, active customers only). Orderings tie by `id`. Accounts without a phone yet show `phone: null` and their `email` (exports put the e-mail in the phone column). */
        get: operations["admin_customers_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/customers/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description The customer card of an active or deleted customer (deleted: name `""`, `deleted_at`). */
        get: operations["admin_customers_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/customers/{id}/cashback-adjustments/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Checks in order: `amount` 1..10 000 000 ("Summani kiriting."), `reason` trimmed 3..300 ("Sababni kiriting."), then for `subtract` `amount ≤ available` under the account lock ("Balans manfiy bo‘lib qoladi."). Allowed for deleted customers. */
        post: operations["admin_customers_cashback_adjustments_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/customers/{id}/sessions/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description The customer's open sessions (signed-in phones and browsers), most recently active first. */
        get: operations["admin_customers_sessions_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/customers/{id}/sessions/{session_id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** @description Sign one session of the customer out (reason `admin_revoked`; the device stops receiving pushes when no other session is left on it). Unknown or already ended session → 404. */
        delete: operations["admin_customers_sessions_destroy"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/dashboard/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["admin_dashboard"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/delivery/issues/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description The delivery exception queue: open issues first (urgent first, then oldest first); `state=resolved` lists the newest resolved first. */
        get: operations["admin_delivery_issues_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/delivery/issues/{id}/resolve/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Close an open issue with a note (audited `delivery.issue_resolved`); 409 `conflict` when it is resolved already. */
        post: operations["admin_delivery_issues_resolve"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/delivery/suspension/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Whether courier dispatch is suspended now (`until` passed → `suspended: false`). */
        get: operations["admin_delivery_suspension_retrieve"];
        put?: never;
        /** @description Suspend courier dispatch (until `until`, or until lifted) or resume it; audited `delivery.suspension_updated`. `until` must be in the future (`in_past`); it is ignored when resuming. */
        post: operations["admin_delivery_suspension_update"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/integrations/billz/import/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Start a Billz import job (single-flight: a queued or running `billz_import` job is returned instead of a new one). Poll `jobs/{id}/`. */
        post: operations["admin_billz_import_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/jobs/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["admin_jobs_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/nav-counts/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["admin_nav_counts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/notification-templates/{status}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["admin_notification_templates_retrieve"];
        put: operations["admin_notification_templates_update"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/notifications/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @description ``?export=csv|xlsx`` of an admin list (contract 1.8).
         *
         *     ``export_name`` (the file name stem and the sheet title) and ``export_headers`` are Uzbek source texts:
         *     they are rendered with ``core.uzsource.tr`` in the request's ``Accept-Language``
         *     (``core.api.language.admin_language``), and ``get_export_rows`` runs with that language active, so the
         *     values it takes from ``core.labels.text`` (and ``yes_no``, ``active_label``, ``refund_state_label``)
         *     follow it. Data (names, ids, amounts, dates) is never translated; the ``export.downloaded`` audit row is
         *     written in Uzbek outside that scope.
         */
        get: operations["admin_notifications_list"];
        put?: never;
        /** @description Multipart with dotted keys (`link.kind`, `audience.type`, …) and an optional `image` (JPEG, PNG or WebP, ≤ 5 MiB). Creates a `draft` (revision 1): nothing is sent until a superuser tested, confirmed and approved it. `scheduled_at` is the requested send time the dispatch waits for. */
        post: operations["admin_notifications_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/notifications/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @description ``?export=csv|xlsx`` of an admin list (contract 1.8).
         *
         *     ``export_name`` (the file name stem and the sheet title) and ``export_headers`` are Uzbek source texts:
         *     they are rendered with ``core.uzsource.tr`` in the request's ``Accept-Language``
         *     (``core.api.language.admin_language``), and ``get_export_rows`` runs with that language active, so the
         *     values it takes from ``core.labels.text`` (and ``yes_no``, ``active_label``, ``refund_state_label``)
         *     follow it. Data (names, ids, amounts, dates) is never translated; the ``export.downloaded`` audit row is
         *     written in Uzbek outside that scope.
         */
        get: operations["admin_notifications_retrieve"];
        put?: never;
        post?: never;
        /** @description Author or superuser; `draft` / `tested` only (409 `invalid_transition`). */
        delete: operations["admin_notifications_destroy"];
        options?: never;
        head?: never;
        /** @description Author or superuser; `draft` / `tested` only (409 `invalid_transition`). Multipart like the create form with every content key optional, `expected_revision` (409 `conflict` when the campaign changed meanwhile) and `remove_image`. A content change bumps `revision`, clears the test confirmation and puts a `tested` campaign back to `draft`; a `scheduled_at` change alone keeps the state (`in_past` applies to a submitted `scheduled_at` only: a kept requested time that went by does not block the edit). */
        patch: operations["admin_notifications_partial_update"];
        trace?: never;
    };
    "/api/v1/admin/notifications/{id}/approve/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Superuser. A `tested` campaign becomes `scheduled` with `dispatch_after = max(now + approval_delay_minutes, scheduled_at)`; nothing is sent by this call — the beat starts the send after `dispatch_after`, and `cancel/` works until then. `expected_revision` stale → 409 `conflict`; `draft` → 409 `invalid_transition`; a repeat on the approved revision answers 200 unchanged. */
        post: operations["admin_notifications_approve"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/notifications/{id}/cancel/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Superuser. Cancel an approved `scheduled` campaign before the beat starts it (state `cancelled`, audited `notification.cancelled`). Idempotent: an already cancelled campaign answers 200 unchanged. A `draft` / `tested` campaign → 409 `invalid_transition` (delete or edit it instead); once the send started → 409 `conflict` (use `stop/`); 404 for an unknown id. */
        post: operations["admin_notifications_cancel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/notifications/{id}/return-to-draft/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Superuser. A `scheduled` (not yet started) or `cancelled` (never started) campaign goes back to `draft`: approval and test confirmation cleared, `revision` bumped, so it must be tested again. */
        post: operations["admin_notifications_return_to_draft"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/notifications/{id}/stop/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Superuser; emergency stop of a `sending` campaign → `stopping`. The running batch finalises it (`partially_sent` when a push went out, else `cancelled`; remaining recipients `stopped`); pushes FCM already accepted cannot be recalled. Idempotent on `stopping` and on a campaign that ended by a stop; otherwise 409 `invalid_transition`. */
        post: operations["admin_notifications_stop"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/notifications/{id}/test/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Superuser. Pushes the current revision of a `draft` / `tested` campaign to the chosen test devices (`device_ids`, 1..10 active registry ids); each push is a real inbox item of the tester and is recorded in `tests[]` with its FCM outcome. 503 `provider_unavailable` when FCM took nothing (the tests are recorded as undelivered). */
        post: operations["admin_notifications_test"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/notifications/{id}/tests/{test_id}/confirm/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Superuser: the test looked right on the device. The test must be the current revision's and delivered (409 `conflict` otherwise); the campaign becomes `tested`. Idempotent. */
        post: operations["admin_notifications_test_confirm"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/notifications/meta/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["admin_notifications_meta"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/notifications/test-devices/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @description ``notifications/test-devices/`` (superuser): the global registry of real staff devices test pushes
         *     go to.
         */
        get: operations["admin_notification_test_devices_list"];
        put?: never;
        /** @description Superuser. Registers the most recently active pushable device of the active customer with `phone` under `label`. Field errors `phone`: `customer_not_found`, `device_not_pushable`, `unique` (already registered). */
        post: operations["admin_notification_test_devices_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/notifications/test-devices/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** @description Superuser. Removes the device from the registry (soft, idempotent); unknown id → 404. */
        delete: operations["admin_notification_test_devices_destroy"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/orders/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @description ``?export=csv|xlsx`` of an admin list (contract 1.8).
         *
         *     ``export_name`` (the file name stem and the sheet title) and ``export_headers`` are Uzbek source texts:
         *     they are rendered with ``core.uzsource.tr`` in the request's ``Accept-Language``
         *     (``core.api.language.admin_language``), and ``get_export_rows`` runs with that language active, so the
         *     values it takes from ``core.labels.text`` (and ``yes_no``, ``active_label``, ``refund_state_label``)
         *     follow it. Data (names, ids, amounts, dates) is never translated; the ``export.downloaded`` audit row is
         *     written in Uzbek outside that scope.
         */
        get: operations["admin_orders_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/orders/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @description ``?export=csv|xlsx`` of an admin list (contract 1.8).
         *
         *     ``export_name`` (the file name stem and the sheet title) and ``export_headers`` are Uzbek source texts:
         *     they are rendered with ``core.uzsource.tr`` in the request's ``Accept-Language``
         *     (``core.api.language.admin_language``), and ``get_export_rows`` runs with that language active, so the
         *     values it takes from ``core.labels.text`` (and ``yes_no``, ``active_label``, ``refund_state_label``)
         *     follow it. Data (names, ids, amounts, dates) is never translated; the ``export.downloaded`` audit row is
         *     written in Uzbek outside that scope.
         */
        get: operations["admin_orders_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/orders/{id}/cancel/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Cancel an order (full refund when paid). A Yandex Delivery order is first made carrier-safe outside the transaction (plan §3.8): an open courier claim is cancelled at Yandex before pickup (free or paid), after pickup a return to the warehouse is requested and the cancel proceeds once Yandex reports it `returning`; a returning / returned parcel needs no call, a delivered order is refused. 409 `not_cancellable` (Yandex refused, delivered, parcel not coming back), 409 `return_requested` (return asked, not confirmed yet: retry later; the order is unchanged), 409 `conflict` (another Yandex operation of the order is running, or Yandex has not shown the cancel yet), 503 `provider_unavailable` (Yandex did not answer; nothing changed). */
        post: operations["admin_orders_cancel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/orders/{id}/confirm-return/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Confirm that the parcel of a Yandex order whose delivery stage is `returning` / `returned` is physically back at the warehouse: stage `returned`, `returned_at`, the open `return_pending` issue resolved (the note is its resolution note), order event `shipment_returned`, audit `order.return_confirmed`. A cancelled order stays cancelled; an open order stays as it is (staff dispatch again or cancel). 409 `invalid_transition` (no returning parcel), 409 `conflict` (confirmed already), 409 `order_busy` (the order is busy). */
        post: operations["admin_orders_confirm_return"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/orders/{id}/dispatch/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Call a Yandex courier for a paid delivery order (plan §3.6): staff confirm they checked the contents and give the parcel weight; `approved_price` accepts the offer of an open price review (`dispatch_review`), `method` switches Standard / Express. The parcel and a new courier claim are stored and the dispatch is queued — nothing is sent to Yandex in the request (202, `delivery.stage` = `courier_requested`); the order's open `dispatch_failed` / `dispatch_review` / `preparation_overdue` issues are resolved. 409 `invalid_transition` (not a paid, open Yandex delivery waiting for a courier: stage `awaiting_dispatch` / `failed` / `returned`, a `handed_to_courier` order only once its parcel is `returned`), 409 `conflict` (a courier claim is still open — a dispatch is running or a courier may come —, a cancel is in progress, `approved_price` without an open price review, or the order is busy), 409 `coordinates_required` (the address has no map pin), 409 `method_disabled` (the method switched to is turned off), 409 `too_heavy` (the weight is above the method's class limit: courier 10 kg, express 20 kg), 409 `not_configured` (the warehouse data is incomplete), 409 `suspended` (dispatch is suspended), 409 `closed` (the warehouse is closed now), 409 `after_cutoff` (past today's dispatch deadline), 409 `returns_unavailable` (the warehouse does not take returned parcels now). */
        post: operations["admin_orders_dispatch"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/orders/{id}/issues/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Staff report a delivery incident of a delivery order (a wrong or missing product…): `kind` must be `incident`. 201 opens the order's incident issue; 200 refreshes the one already open (note and urgency). Audited `delivery.issue_opened`; an urgent incident alerts staff. A pickup order → 409 `conflict`. */
        post: operations["admin_orders_issues_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/orders/{id}/retry-shipment/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["admin_orders_retry_shipment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/orders/{id}/transition/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["admin_orders_transition"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/orders/status-counts/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["admin_orders_status_counts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/payments/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @description ``?export=csv|xlsx`` of an admin list (contract 1.8).
         *
         *     ``export_name`` (the file name stem and the sheet title) and ``export_headers`` are Uzbek source texts:
         *     they are rendered with ``core.uzsource.tr`` in the request's ``Accept-Language``
         *     (``core.api.language.admin_language``), and ``get_export_rows`` runs with that language active, so the
         *     values it takes from ``core.labels.text`` (and ``yes_no``, ``active_label``, ``refund_state_label``)
         *     follow it. Data (names, ids, amounts, dates) is never translated; the ``export.downloaded`` audit row is
         *     written in Uzbek outside that scope.
         */
        get: operations["admin_payments_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/payments/{id}/refunds/{refund_id}/resolve/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Close an `unknown` / `manual_required` refund after a manual check, or a `failed` Click refund as `succeeded` after a fresh Click status check (`manual_payout: true` when Click still reports the payment paid and staff paid the customer by hand; 503 when Click does not answer). Audited `refund.state_changed` with the actor; order event `refund_succeeded` / `refund_failed`. 409 `click_not_reversed` (Click still shows the payment paid) / `click_no_paydoc` (no Click payment id): pay out by hand, then `manual_payout: true`; 409 `click_fake_mode` (Click fake under the production settings); 409 `order_busy` (the order is busy; retry). */
        post: operations["admin_payments_refund_resolve"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/payments/{id}/refunds/{refund_id}/retry/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Retry a `failed` refund: a new refund of the payment (Click `requested`, Payme `manual_required`) and its `refund_requested` order event. 409 `click_fake_mode` (Click fake under the production settings), 409 `order_busy` (the order is busy; retry). */
        post: operations["admin_payments_refund_retry"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/products/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @description ``?export=csv|xlsx`` of an admin list (contract 1.8).
         *
         *     ``export_name`` (the file name stem and the sheet title) and ``export_headers`` are Uzbek source texts:
         *     they are rendered with ``core.uzsource.tr`` in the request's ``Accept-Language``
         *     (``core.api.language.admin_language``), and ``get_export_rows`` runs with that language active, so the
         *     values it takes from ``core.labels.text`` (and ``yes_no``, ``active_label``, ``refund_state_label``)
         *     follow it. Data (names, ids, amounts, dates) is never translated; the ``export.downloaded`` audit row is
         *     written in Uzbek outside that scope.
         */
        get: operations["admin_products_list"];
        put?: never;
        /**
         * @description ``?export=csv|xlsx`` of an admin list (contract 1.8).
         *
         *     ``export_name`` (the file name stem and the sheet title) and ``export_headers`` are Uzbek source texts:
         *     they are rendered with ``core.uzsource.tr`` in the request's ``Accept-Language``
         *     (``core.api.language.admin_language``), and ``get_export_rows`` runs with that language active, so the
         *     values it takes from ``core.labels.text`` (and ``yes_no``, ``active_label``, ``refund_state_label``)
         *     follow it. Data (names, ids, amounts, dates) is never translated; the ``export.downloaded`` audit row is
         *     written in Uzbek outside that scope.
         */
        post: operations["admin_products_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/products/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @description ``?export=csv|xlsx`` of an admin list (contract 1.8).
         *
         *     ``export_name`` (the file name stem and the sheet title) and ``export_headers`` are Uzbek source texts:
         *     they are rendered with ``core.uzsource.tr`` in the request's ``Accept-Language``
         *     (``core.api.language.admin_language``), and ``get_export_rows`` runs with that language active, so the
         *     values it takes from ``core.labels.text`` (and ``yes_no``, ``active_label``, ``refund_state_label``)
         *     follow it. Data (names, ids, amounts, dates) is never translated; the ``export.downloaded`` audit row is
         *     written in Uzbek outside that scope.
         */
        get: operations["admin_products_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * @description ``?export=csv|xlsx`` of an admin list (contract 1.8).
         *
         *     ``export_name`` (the file name stem and the sheet title) and ``export_headers`` are Uzbek source texts:
         *     they are rendered with ``core.uzsource.tr`` in the request's ``Accept-Language``
         *     (``core.api.language.admin_language``), and ``get_export_rows`` runs with that language active, so the
         *     values it takes from ``core.labels.text`` (and ``yes_no``, ``active_label``, ``refund_state_label``)
         *     follow it. Data (names, ids, amounts, dates) is never translated; the ``export.downloaded`` audit row is
         *     written in Uzbek outside that scope.
         */
        patch: operations["admin_products_partial_update"];
        trace?: never;
    };
    "/api/v1/admin/products/{id}/images/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description One multipart part `file` (JPEG, PNG or WebP, ≤ 5 MiB, ≤ 8 images per product). */
        post: operations["admin_product_images_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/products/{id}/images/{image_id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["admin_product_images_destroy"];
        options?: never;
        head?: never;
        patch: operations["admin_product_images_partial_update"];
        trace?: never;
    };
    "/api/v1/admin/products/{id}/images/order/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["admin_product_images_reorder"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/products/{product_id}/assistant/jobs/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Queue an AI generation for the product (202), or return its queued/running job (200), or `nothing_to_fill: true` with `job: null` (200) when the mode finds no key to suggest. Poll `assistant/jobs/{id}/`. */
        post: operations["admin_assistant_jobs_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/products/stats/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["admin_products_stats"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/segments/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @description ``?export=csv|xlsx`` of an admin list (contract 1.8).
         *
         *     ``export_name`` (the file name stem and the sheet title) and ``export_headers`` are Uzbek source texts:
         *     they are rendered with ``core.uzsource.tr`` in the request's ``Accept-Language``
         *     (``core.api.language.admin_language``), and ``get_export_rows`` runs with that language active, so the
         *     values it takes from ``core.labels.text`` (and ``yes_no``, ``active_label``, ``refund_state_label``)
         *     follow it. Data (names, ids, amounts, dates) is never translated; the ``export.downloaded`` audit row is
         *     written in Uzbek outside that scope.
         */
        get: operations["admin_segments_list"];
        put?: never;
        /**
         * @description ``?export=csv|xlsx`` of an admin list (contract 1.8).
         *
         *     ``export_name`` (the file name stem and the sheet title) and ``export_headers`` are Uzbek source texts:
         *     they are rendered with ``core.uzsource.tr`` in the request's ``Accept-Language``
         *     (``core.api.language.admin_language``), and ``get_export_rows`` runs with that language active, so the
         *     values it takes from ``core.labels.text`` (and ``yes_no``, ``active_label``, ``refund_state_label``)
         *     follow it. Data (names, ids, amounts, dates) is never translated; the ``export.downloaded`` audit row is
         *     written in Uzbek outside that scope.
         */
        post: operations["admin_segments_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/segments/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @description ``?export=csv|xlsx`` of an admin list (contract 1.8).
         *
         *     ``export_name`` (the file name stem and the sheet title) and ``export_headers`` are Uzbek source texts:
         *     they are rendered with ``core.uzsource.tr`` in the request's ``Accept-Language``
         *     (``core.api.language.admin_language``), and ``get_export_rows`` runs with that language active, so the
         *     values it takes from ``core.labels.text`` (and ``yes_no``, ``active_label``, ``refund_state_label``)
         *     follow it. Data (names, ids, amounts, dates) is never translated; the ``export.downloaded`` audit row is
         *     written in Uzbek outside that scope.
         */
        get: operations["admin_segments_retrieve"];
        put?: never;
        post?: never;
        /**
         * @description ``?export=csv|xlsx`` of an admin list (contract 1.8).
         *
         *     ``export_name`` (the file name stem and the sheet title) and ``export_headers`` are Uzbek source texts:
         *     they are rendered with ``core.uzsource.tr`` in the request's ``Accept-Language``
         *     (``core.api.language.admin_language``), and ``get_export_rows`` runs with that language active, so the
         *     values it takes from ``core.labels.text`` (and ``yes_no``, ``active_label``, ``refund_state_label``)
         *     follow it. Data (names, ids, amounts, dates) is never translated; the ``export.downloaded`` audit row is
         *     written in Uzbek outside that scope.
         */
        delete: operations["admin_segments_destroy"];
        options?: never;
        head?: never;
        /** @description A rule change answers 409 `conflict` while an approved `scheduled` notification targets the segment (its audience must not grow before the dispatch); renaming is always allowed. */
        patch: operations["admin_segments_partial_update"];
        trace?: never;
    };
    "/api/v1/admin/segments/{id}/members/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @description ``?export=csv|xlsx`` of an admin list (contract 1.8).
         *
         *     ``export_name`` (the file name stem and the sheet title) and ``export_headers`` are Uzbek source texts:
         *     they are rendered with ``core.uzsource.tr`` in the request's ``Accept-Language``
         *     (``core.api.language.admin_language``), and ``get_export_rows`` runs with that language active, so the
         *     values it takes from ``core.labels.text`` (and ``yes_no``, ``active_label``, ``refund_state_label``)
         *     follow it. Data (names, ids, amounts, dates) is never translated; the ``export.downloaded`` audit row is
         *     written in Uzbek outside that scope.
         */
        get: operations["admin_segment_members_list"];
        put?: never;
        /** @description 409 `conflict` while an approved `scheduled` notification targets the segment (its audience must not grow before the dispatch). */
        post: operations["admin_segment_members_add"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/segments/{id}/members/{customer_id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** @description Removes a manual membership; a rule-only member answers 409 conflict. */
        delete: operations["admin_segment_members_remove"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/specialist/appointments/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description The caller's schedule and own appointments of `date` (default today, Tashkent). */
        get: operations["specialist_appointments_day"];
        put?: never;
        /** @description Book a visit in the caller's own calendar (a phone call or a walk-in), created directly as confirmed: one of the caller's active services at one of their active clinics, with the staff slot rules (5-minute grid, future, inside the hours of that day and clinic, outside blocked periods, no overlap: a concurrent booking of the slot answers 409 conflict). A phone no customer holds creates the customer from `phone` and `name`. The profile must be published (409 conflict otherwise). Recorded like a staff booking (`requested_via=admin`) with the specialist as the actor. */
        post: operations["specialist_appointments_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/specialist/appointments/{id}/{action}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description confirm / reject (a requested visit, before its start) or attend (a confirmed visit, from its start on); otherwise 409 invalid_transition. */
        post: operations["specialist_appointments_action"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/specialist/appointments/{id}/cancel/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Cancel an own open appointment before its start; the customer is notified. */
        post: operations["specialist_appointments_cancel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/specialist/appointments/{id}/reschedule/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Move an own open appointment before its start (same slot rules as staff). Moving it to another clinic needs `customer_agreed`. */
        post: operations["specialist_appointments_reschedule"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/specialist/appointments/meta/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description The admin booking-dialog meta for the caller only: their active services and active clinics. `specialists` is empty while the profile is unpublished. */
        get: operations["specialist_appointments_meta"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/specialist/appointments/pending-summary/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description The admin pending summary over the caller's own requested appointments. */
        get: operations["specialist_appointments_pending_summary"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/specialist/appointments/range/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description The caller's week and month boards in the admin range shape: `detail=counts` (default) up to 42 days, `detail=full` up to 7 days. The caller's profile is always listed, even as a draft. */
        get: operations["specialist_appointments_range"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/specialist/availability/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["specialist_availability"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/specialist/blocks/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["specialist_block_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/specialist/blocks/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["specialist_block_update"];
        post?: never;
        delete: operations["specialist_block_delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/specialist/conflicts/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description The caller's open future appointments their current schedule no longer covers, by start; reschedule or cancel them through specialist/appointments/{id}/reschedule|cancel/. */
        get: operations["specialist_conflicts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/specialist/overrides/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["specialist_override_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/specialist/overrides/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["specialist_override_update"];
        post?: never;
        delete: operations["specialist_override_delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/specialist/profile/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["specialist_profile"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** @description Every field optional; texts merge leaf by leaf; `location_id`, `location_ids` and `position` are ignored. `is_active: true` with `publish_blockers` left answers 409 `conflict` naming them; `is_active: false` with requested/confirmed appointments ahead answers 409 unless `force: true` (the appointments are kept either way). */
        patch: operations["specialist_profile_update"];
        trace?: never;
    };
    "/api/v1/admin/specialist/profile/photo/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** @description One multipart part `file` (JPEG, PNG or WebP, ≤ 5 MiB); replaces the current photo. */
        put: operations["specialist_profile_photo_update"];
        post?: never;
        delete: operations["specialist_profile_photo_destroy"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/specialist/services/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description A new own service with the price and duration a booking snapshots; appended after the others. A name already used answers 400 `unique`; at most 50 services. */
        post: operations["specialist_services_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/specialist/services/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** @description Delete an own service that was never booked. One with appointments (any status) answers 409 `conflict`: deactivate it instead (`is_active: false`). */
        delete: operations["specialist_services_destroy"];
        options?: never;
        head?: never;
        /** @description Every field optional; texts merge leaf by leaf. `is_active: false` stops offering the service at once; booked appointments keep their price and duration. Another specialist's service is 404. */
        patch: operations["specialist_services_partial_update"];
        trace?: never;
    };
    "/api/v1/admin/specialist/weekly-hours/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** @description The whole week at the assigned clinics: a weekday left out is not a working day. Appointments already booked outside the new hours are kept (see `specialist/conflicts/`). */
        put: operations["specialist_weekly_hours_update"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/specialists/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @description ``?export=csv|xlsx`` of an admin list (contract 1.8).
         *
         *     ``export_name`` (the file name stem and the sheet title) and ``export_headers`` are Uzbek source texts:
         *     they are rendered with ``core.uzsource.tr`` in the request's ``Accept-Language``
         *     (``core.api.language.admin_language``), and ``get_export_rows`` runs with that language active, so the
         *     values it takes from ``core.labels.text`` (and ``yes_no``, ``active_label``, ``refund_state_label``)
         *     follow it. Data (names, ids, amounts, dates) is never translated; the ``export.downloaded`` audit row is
         *     written in Uzbek outside that scope.
         */
        get: operations["admin_specialists_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/specialists/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @description ``?export=csv|xlsx`` of an admin list (contract 1.8).
         *
         *     ``export_name`` (the file name stem and the sheet title) and ``export_headers`` are Uzbek source texts:
         *     they are rendered with ``core.uzsource.tr`` in the request's ``Accept-Language``
         *     (``core.api.language.admin_language``), and ``get_export_rows`` runs with that language active, so the
         *     values it takes from ``core.labels.text`` (and ``yes_no``, ``active_label``, ``refund_state_label``)
         *     follow it. Data (names, ids, amounts, dates) is never translated; the ``export.downloaded`` audit row is
         *     written in Uzbek outside that scope.
         */
        get: operations["admin_specialists_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** @description Every field optional; texts merge leaf by leaf. `is_active: false` with requested/confirmed appointments ahead answers 409 `conflict` naming their count unless `force: true` (the appointments are kept either way). */
        patch: operations["admin_specialists_partial_update"];
        trace?: never;
    };
    "/api/v1/admin/specialists/{id}/blocks/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Blocked periods touching the days `date_from` … `date_to`, by start; default today on. */
        get: operations["admin_specialists_blocks_list"];
        put?: never;
        /** @description An absolute busy/off range; it may not overlap another block of the specialist. */
        post: operations["admin_specialists_blocks_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/specialists/{id}/blocks/{block_id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["admin_specialists_blocks_destroy"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/specialists/{id}/conflicts/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description The specialist's requested/confirmed appointments starting now or later that its current schedule no longer covers (a day without hours, outside that day's hours, inside a blocked period or the recurring break), by start. Schedule changes never move or cancel appointments; reschedule or cancel these through appointments/{id}/reschedule|cancel/. */
        get: operations["admin_specialists_conflicts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/specialists/{id}/overrides/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Date overrides by date; default from today (Tashkent). */
        get: operations["admin_specialists_overrides_list"];
        put?: never;
        /** @description One date's own hours, or a day off (`start` and `end` null); one per date. */
        post: operations["admin_specialists_overrides_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/specialists/{id}/overrides/{override_id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["admin_specialists_overrides_destroy"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/specialists/{id}/photo/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** @description One multipart part `file` (JPEG, PNG or WebP, ≤ 5 MiB); replaces the current photo. */
        put: operations["admin_specialists_photo_update"];
        post?: never;
        delete: operations["admin_specialists_photo_destroy"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/specialists/{id}/services/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description A new service of this specialist with the price and duration a booking snapshots; appended after its others. A name the specialist already uses answers 400 `unique`; at most 50 services. */
        post: operations["admin_specialists_services_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/specialists/{id}/services/{service_id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** @description Delete a service that was never booked. One with appointments (any status) answers 409 `conflict`: deactivate it instead (`is_active: false`). */
        delete: operations["admin_specialists_services_destroy"];
        options?: never;
        head?: never;
        /** @description Every field optional; texts merge leaf by leaf. `is_active: false` stops offering the service at once; booked appointments keep their price and duration. Another specialist's service is 404. */
        patch: operations["admin_specialists_services_partial_update"];
        trace?: never;
    };
    "/api/v1/admin/specialists/{id}/working-hours/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** @description The whole week: a weekday left out is not a working day. Appointments already booked outside the new hours are kept (see `specialists/{id}/conflicts/`). */
        put: operations["admin_specialists_working_hours_update"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/specialists/invite/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Staff → Add employee → Specialist: creates the Specialist account and its private draft profile together (the profile is named after the account; the public name can be changed later). An email already in use → 400 `unique` on `email`, nothing is created. Resend the invitation with `staff/{id}/send-password-link/` or `staff/{id}/reset-password/`: same account, same profile. */
        post: operations["admin_specialist_invite"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/staff/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Every staff member: the directory behind the audit-log actor filter. A manager's rows also carry `full_name`, `is_manager`, `last_login_at`, `linked_providers`, `created_at` and (feat/admin-ux) `must_change_password`, `mfa_enabled` and `invite`; for anyone else these keys are `null`. */
        get: operations["admin_staff_list"];
        put?: never;
        /** @description Manager only (403 `permission_denied` otherwise). Creates an active staff account. `delivery`: `temporary_password` (generated, shown once in the answer), `email_link` (an invite link e-mailed to the account; no usable password until it is used) or `both`; either way the person must set their own password first (`must_change_password`). `email` already used by any account → `unique`; an e-mail delivery while `capabilities.staff_email_invite` is false → `delivery` `invalid_choice`. */
        post: operations["admin_staff_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/staff/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Manager only (403 `permission_denied` otherwise). */
        get: operations["admin_staff_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** @description Manager only (403 `permission_denied` otherwise). Changes `full_name` and/or `is_manager` (`email`, `is_active`, `password` → `read_only`). Removing the manager role of the caller or of the last active manager → 409 `conflict`. */
        patch: operations["admin_staff_partial_update"];
        trace?: never;
    };
    "/api/v1/admin/staff/{id}/deactivate/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Manager only (403 `permission_denied` otherwise). The account can no longer sign in: every open session is revoked (`deactivated`), linked identities stay. The caller's own account or the last active manager → 409 `conflict`; an inactive account → 200 unchanged. */
        post: operations["admin_staff_deactivate"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/staff/{id}/reactivate/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Manager only (403 `permission_denied` otherwise). The account may sign in again (password, identities and manager role kept); an active account → 200 unchanged. */
        post: operations["admin_staff_reactivate"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/staff/{id}/reset-mfa/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Manager only (403 `permission_denied` otherwise). A lost phone: removes the account's admin panel MFA (TOTP device and recovery codes; ops console devices stay) and revokes every open session (`admin_revoked`). The caller's own account, an account without panel MFA, or a superuser's account unless the caller is a superuser too (`manage.py resetstaffmfa` stays the break-glass path) → 409 `conflict`. Optional body `reason` (trimmed, at most 200 characters, blank allowed) is kept on the audit entry. Audited `auth.mfa_reset` and alerted. */
        post: operations["admin_staff_reset_mfa"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/staff/{id}/reset-password/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Manager only (403 `permission_denied` otherwise). Replaces the password and revokes every open session (`password_changed`) and every earlier link; linked identities stay. `delivery` (optional body, default `temporary_password`): a generated temporary password (shown once), `email_link` (the password becomes unusable and a reset link is e-mailed) or `both`; the person must then set their own password. The caller's own account → 409 `conflict` (use `auth/change-password/`); a superuser's account with `temporary_password` or `both`, unless the caller is a superuser too → 409 `conflict` (send `email_link`). */
        post: operations["admin_staff_reset_password"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/staff/{id}/send-password-link/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Manager only (403 `permission_denied` otherwise). E-mails the account a new single-use link to set its password (invite for an account that never signed in nor set one, else reset); the password and the sessions are not changed, earlier links are revoked. The caller's own account, an inactive account, or e-mail links not available → 409 `conflict`; 5/hour per manager and account. */
        post: operations["admin_staff_send_password_link"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/staff/{id}/specialist-role/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Staff → Edit: `specialist` converts an eligible Staff or Manager account (its draft profile is created, or the profile it already owns is reused unpublished); `staff` ends specialist access and unpublishes the profile, keeping it and its appointments on the account. Sessions are revoked on a change; the role the account already has changes nothing. The caller's own account, an inactive account, a superuser, operations-console access or the last active manager → 409 `conflict`. */
        post: operations["admin_staff_specialist_role"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/appointments/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Book a slot (`requested`; staff confirm it). 409 `phone_required` first while the account has no verified phone (`me/phone/`). Checks in order: specialist, service, consent, open appointments limit, then the start (aware, lead time, horizon, grid, hours, busy, own overlap); a lost race answers 409 `slot_taken`. */
        post: operations["customer_appointments_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/appointments/{id}/cancel/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Cancel an own `requested`/`confirmed` appointment before `BOOKING_CANCEL_MIN_LEAD_MINUTES`; else 409 `not_cancellable`. The slot is free again; no push. */
        post: operations["customer_appointments_cancel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/login/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * @description ``auth/*`` routes (before sign-in): device headers required, no bearer (``auth/logout/`` adds the
         *     optional one), throttles ``customer_auth_device`` + ``customer_auth_ip`` unless the view names its own.
         */
        post: operations["customer_auth_login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/logout/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * @description ``auth/*`` routes (before sign-in): device headers required, no bearer (``auth/logout/`` adds the
         *     optional one), throttles ``customer_auth_device`` + ``customer_auth_ip`` unless the view names its own.
         */
        post: operations["customer_auth_logout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/refresh/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * @description ``auth/*`` routes (before sign-in): device headers required, no bearer (``auth/logout/`` adds the
         *     optional one), throttles ``customer_auth_device`` + ``customer_auth_ip`` unless the view names its own.
         */
        post: operations["customer_auth_refresh"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/reset-password/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * @description ``auth/*`` routes (before sign-in): device headers required, no bearer (``auth/logout/`` adds the
         *     optional one), throttles ``customer_auth_device`` + ``customer_auth_ip`` unless the view names its own.
         */
        post: operations["customer_auth_reset_password"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/send-code/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * @description ``auth/*`` routes (before sign-in): device headers required, no bearer (``auth/logout/`` adds the
         *     optional one), throttles ``customer_auth_device`` + ``customer_auth_ip`` unless the view names its own.
         */
        post: operations["customer_auth_send_code"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/set-password/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * @description ``auth/*`` routes (before sign-in): device headers required, no bearer (``auth/logout/`` adds the
         *     optional one), throttles ``customer_auth_device`` + ``customer_auth_ip`` unless the view names its own.
         */
        post: operations["customer_auth_set_password"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/social/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * @description ``auth/*`` routes (before sign-in): device headers required, no bearer (``auth/logout/`` adds the
         *     optional one), throttles ``customer_auth_device`` + ``customer_auth_ip`` unless the view names its own.
         */
        post: operations["customer_auth_social"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/social/complete/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * @description ``auth/*`` routes (before sign-in): device headers required, no bearer (``auth/logout/`` adds the
         *     optional one), throttles ``customer_auth_device`` + ``customer_auth_ip`` unless the view names its own.
         */
        post: operations["customer_auth_social_complete"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/social/nonce/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @description ``auth/*`` routes (before sign-in): device headers required, no bearer (``auth/logout/`` adds the
         *     optional one), throttles ``customer_auth_device`` + ``customer_auth_ip`` unless the view names its own.
         */
        get: operations["customer_auth_social_nonce"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/verify-code/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * @description ``auth/*`` routes (before sign-in): device headers required, no bearer (``auth/logout/`` adds the
         *     optional one), throttles ``customer_auth_device`` + ``customer_auth_ip`` unless the view names its own.
         */
        post: operations["customer_auth_verify_code"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cart/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Signed-in customer routes (**C**). */
        get: operations["customer_cart_retrieve"];
        put?: never;
        post?: never;
        /** @description Signed-in customer routes (**C**). */
        delete: operations["customer_cart_clear"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cart/items/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Signed-in customer routes (**C**). */
        post: operations["customer_cart_items_create"];
        /** @description Signed-in customer routes (**C**). */
        delete: operations["customer_cart_items_bulk_delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cart/items/{product_id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** @description Signed-in customer routes (**C**). */
        delete: operations["customer_cart_items_destroy"];
        options?: never;
        head?: never;
        /** @description Signed-in customer routes (**C**). */
        patch: operations["customer_cart_items_update"];
        trace?: never;
    };
    "/api/v1/catalog/banners/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @description Optional-auth routes (**O**): anonymous callers count against ``public`` / ``public_ip``, signed-in
         *     callers against ``customer``; device headers optional.
         */
        get: operations["customer_catalog_banners_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/catalog/categories/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @description Optional-auth routes (**O**): anonymous callers count against ``public`` / ``public_ip``, signed-in
         *     callers against ``customer``; device headers optional.
         */
        get: operations["customer_catalog_categories_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/catalog/products/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @description Optional-auth routes (**O**): anonymous callers count against ``public`` / ``public_ip``, signed-in
         *     callers against ``customer``; device headers optional.
         */
        get: operations["customer_catalog_products_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/catalog/products/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @description Optional-auth routes (**O**): anonymous callers count against ``public`` / ``public_ip``, signed-in
         *     callers against ``customer``; device headers optional.
         */
        get: operations["customer_catalog_products_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/catalog/products/{slug}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description One visible product by its website slug (B-W1); the same shape as the id route. */
        get: operations["customer_catalog_products_by_slug_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/delivery/calculate/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Signed-in customer routes (**C**). */
        post: operations["customer_delivery_calculate"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/delivery/regions/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @description Optional-auth routes (**O**): anonymous callers count against ``public`` / ``public_ip``, signed-in
         *     callers against ``customer``; device headers optional.
         */
        get: operations["customer_delivery_regions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/health/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["health_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Signed-in customer routes (**C**). */
        get: operations["customer_me_retrieve"];
        put?: never;
        post?: never;
        /** @description Signed-in customer routes (**C**). */
        delete: operations["customer_me_destroy"];
        options?: never;
        head?: never;
        /** @description Signed-in customer routes (**C**). */
        patch: operations["customer_me_partial_update"];
        trace?: never;
    };
    "/api/v1/me/addresses/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Signed-in customer routes (**C**). */
        get: operations["customer_me_addresses_list"];
        put?: never;
        /** @description Signed-in customer routes (**C**). */
        post: operations["customer_me_addresses_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/addresses/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * @description The address row is re-read under the customer-level lock by the service (404 when it is not the
         *     caller's, or another request removed it meanwhile).
         */
        delete: operations["customer_me_addresses_destroy"];
        options?: never;
        head?: never;
        /**
         * @description The address row is re-read under the customer-level lock by the service (404 when it is not the
         *     caller's, or another request removed it meanwhile).
         */
        patch: operations["customer_me_addresses_partial_update"];
        trace?: never;
    };
    "/api/v1/me/addresses/{id}/default/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Signed-in customer routes (**C**). */
        post: operations["customer_me_addresses_default"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/appointments/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description `upcoming` (default): open appointments starting now or later, by start; `past`: the rest, newest first. Limited to the history horizon. */
        get: operations["customer_my_appointments_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/appointments/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description One own appointment (404 for another customer's or one before the history horizon). */
        get: operations["customer_my_appointments_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/cashback/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Balance, active holds (with their effective expiry), lifetime total, tier and next tier under the active policy, the policy bands and the QR token lifetime. */
        get: operations["customer_cashback_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/cashback/ledger/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description The customer's own ledger, newest first. Entries before the history horizon keep their amounts but show `order_id: null` and the subtitle of the previous account; the staff reason of an adjustment is never shown. */
        get: operations["customer_cashback_ledger_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/consent/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Signed-in customer routes (**C**). */
        post: operations["customer_me_consent"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/device/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** @description Signed-in customer routes (**C**). */
        put: operations["customer_me_device_update"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/email/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Attach (or replace) the verified e-mail address with its code; re-authentication as `me/phone/`. → 200 `Me`. */
        post: operations["customer_me_email_attach"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/email/code/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Send a `verify_email` code to the address to attach (or to replace the current one). 409 `conflict` when it already is the account's address, `email_taken` when another account has it. */
        post: operations["customer_me_email_code"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/image/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** @description Signed-in customer routes (**C**). */
        put: operations["customer_me_image_update"];
        post?: never;
        /** @description Signed-in customer routes (**C**). */
        delete: operations["customer_me_image_destroy"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/notifications/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description The inbox, newest first, inside the history horizon; also the rows whose push could not be sent. `unread_count` is the badge. */
        get: operations["customer_notifications_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/notifications/{id}/read/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Mark one row read (idempotent); reading implies delivery (counted like an ack). */
        post: operations["customer_notifications_read"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/notifications/ack/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Delivery acknowledgement from the push handler (1..50 ids). Unknown ids and ids of other customers are ignored silently; a retry never counts twice. */
        post: operations["customer_notifications_ack"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/notifications/read-all/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Mark every unread row read (each acknowledged first). */
        post: operations["customer_notifications_read_all"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/notifications/unread-count/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description The unread badge (polling). */
        get: operations["customer_notifications_unread_count"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/orders/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Signed-in customer routes (**C**) served by a viewset. */
        get: operations["customer_orders_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/orders/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Signed-in customer routes (**C**) served by a viewset. */
        get: operations["customer_orders_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/password/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Signed-in customer routes (**C**). */
        post: operations["customer_me_password"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/phone/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Attach the phone with its SMS code. Re-authentication first: the `password`, or instead (none, or a forgotten one) a `reset_password` `verification_token` of the account's own phone or e-mail; only an account with no password, phone or e-mail passes on a session signed in within 10 minutes, else `reauth_required`. → 200 `Me` with the phone set (checkout, pay, booking and the QR open up). */
        post: operations["customer_me_phone_attach"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/phone/code/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Send an `attach_phone` SMS code to the phone a phoneless account wants to attach (every OTP limit of `auth/send-code/`). 409 `conflict` when the account has a phone, `phone_taken` when another account (active or deleted) holds the number: no merge, the customer signs in with that phone. */
        post: operations["customer_me_phone_code"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/qr/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description A fresh single-use personal QR token (60 s; at most two live tokens per customer). Request a new one every `refresh_in_seconds` and whenever the screen regains focus. 409 `phone_required` while the account has no verified phone (`me/phone/`). */
        get: operations["customer_qr_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/sessions/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Every open session of the customer (each signed-in phone or browser), most recently active first; `current` marks the caller's own. */
        get: operations["customer_sessions_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/sessions/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** @description Sign one session out (the row menu «Chiqish»). The caller's own session may be named too: it is a logout. Unknown, already ended or another customer's session → 404. */
        delete: operations["customer_sessions_destroy"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/sessions/revoke-others/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description «Boshqa qurilmalardan chiqish»: every session but the caller's own ends. */
        post: operations["customer_sessions_revoke_others"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/social/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Signed-in customer routes (**C**). */
        post: operations["customer_me_social_link"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/social/{provider}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** @description Signed-in customer routes (**C**). */
        delete: operations["customer_me_social_unlink"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}/cancel/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Signed-in customer routes (**C**). */
        post: operations["customer_orders_cancel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}/pay/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Signed-in customer routes (**C**). */
        post: operations["customer_orders_pay"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}/reorder/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Signed-in customer routes (**C**). */
        post: operations["customer_orders_reorder"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/checkout/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Signed-in customer routes (**C**). */
        post: operations["customer_orders_checkout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/pos/cashback/resolve-qr/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Resolve a scanned personal QR token (single use). Every failure answers 409 `qr_invalid` with the same body. `customer_ref` is opaque and stable per (POS device, customer). */
        post: operations["pos_cashback_resolve_qr"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/services/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Active services offered by at least one active specialist, with their price range. */
        get: operations["customer_services_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/settings/public/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @description Optional-auth routes (**O**): anonymous callers count against ``public`` / ``public_ip``, signed-in
         *     callers against ``customer``; device headers optional.
         */
        get: operations["customer_settings_public_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/specialists/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Active specialists by position and name, with their active services. */
        get: operations["customer_specialists_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/specialists/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description One active specialist (404 when inactive or unknown). */
        get: operations["customer_specialists_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/specialists/{id}/slots/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Free start times of one specialist for one service on one day (grid relative to the start of the working hours; lead time, blocks, the break and open appointments removed). */
        get: operations["customer_specialist_slots_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/specialists/{slug}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description One active specialist by its website slug (B-W1; 404 when inactive or unknown). */
        get: operations["customer_specialists_by_slug_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/webhooks/bts/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description BTS status notification (JSON or form-data, customer contract §2.13.3), authenticated by `?token=<BTS_WEBHOOK_SECRET>` or the `X-GD-Webhook-Token` header; the status is re-tracked with our tracking number. */
        post: operations["webhook_bts_status"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/webhooks/click/complete/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Click SHOP API Complete (action 1); provider-native body (customer contract §2.13.1). */
        post: operations["webhook_click_complete"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/webhooks/click/prepare/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Click SHOP API Prepare (action 0); provider-native body (customer contract §2.13.1). */
        post: operations["webhook_click_prepare"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/webhooks/payme/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Payme Merchant API (JSON-RPC 2.0); HTTP 200 with a JSON-RPC body (customer contract §2.13.2). */
        post: operations["webhook_payme_rpc"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/webhooks/uzum/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Uzum Checkout payment callback (an unsigned hint): `?token=` is our shared secret; answers 200 for a verified token and re-reads the payment's status asynchronously. */
        post: operations["webhook_uzum_checkout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/webhooks/yandex-delivery/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Yandex Delivery claim callback (an unauthenticated hint): `?ref=<order>-<hmac>` (our own reference, registered per claim) plus the `updated_ts` and `claim_id` Yandex appends; answers 200 for a verified ref and re-reads the claim asynchronously. */
        post: operations["webhook_yandex_delivery_status"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        Access: {
            access: string;
            /** Format: date-time */
            access_expires_at: string;
            /** Format: date-time */
            refresh_expires_at: string;
        };
        Ack: {
            acknowledged: number;
        };
        AckRequestRequest: {
            inbox_ids: number[];
        };
        /** @description An e-mailed password link: queued for the person's address (``sent``), valid until ``expires_at``. */
        Activation: {
            /** Format: date-time */
            expires_at: string;
            /** @description The e-mail was queued (delivered by the outbox). */
            sent: boolean;
        };
        /**
         * @description ``Actor = {"id", "display_name"}``: the staff full name, else the email (``null`` = system).
         *
         *     Takes any staff user instance; declare it with ``allow_null=True`` where the actor may be the system.
         */
        Actor: {
            readonly display_name: string;
            id: number;
        };
        /**
         * @description ``POST`` (``text`` required) and ``PATCH`` (``partial``) of ``me/addresses/`` (customer contract
         *     §2.2.7).
         */
        AddressWriteRequest: {
            city_code?: string;
            comment?: string;
            is_default?: boolean;
            label?: string;
            /** Format: double */
            latitude?: number | null;
            /** Format: double */
            longitude?: number | null;
            region_code?: string;
            text: string;
        };
        /**
         * @description * `add` - add
         *     * `subtract` - subtract
         * @enum {string}
         */
        AdjustmentDirectionEnum: "add" | "subtract";
        /** @description One open session of the customer (``CustomerSession`` without ``current``). */
        AdminCustomerSession: {
            /** Format: date-time */
            created_at: string;
            device: string;
            /** Format: uuid */
            id: string;
            /** @description "Tashkent, Tashkent, UZ"; "—" when unknown. */
            location: string;
            platform: (components["schemas"]["OrderChannelEnum"] | components["schemas"]["NullEnum"]) | null;
            /** Format: date-time */
            updated_at: string;
        };
        AdminLoginResult: components["schemas"]["LoginResponse"] | components["schemas"]["MfaChallenge"];
        /**
         * @description * `confirm` - confirm
         *     * `reject` - reject
         *     * `attend` - attend
         *     * `reschedule` - reschedule
         *     * `cancel` - cancel
         * @enum {string}
         */
        AllowedActionsEnum: "confirm" | "reject" | "attend" | "reschedule" | "cancel";
        /**
         * @description * `customer` - customer
         *     * `admin` - admin
         * @enum {string}
         */
        AppointmentCancelledByEnum: "customer" | "admin";
        /** @description ``POST appointments/{id}/cancel/``: optional ``reason`` (≤ 300), kept as the staff note. */
        AppointmentCancelRequest: {
            reason?: string;
        };
        AppointmentClinic: {
            address: string;
            id: number;
            name: string;
        };
        /**
         * @description ``POST appointments/`` (T10): ``specialist_id``, ``service_id`` (one of that specialist's active
         *     services), ``customer_id`` | ``phone``, ``start`` (aware, 5-minute grid, inside working hours), ``note``
         *     (≤ 300). A ``phone`` no customer holds books a walk-in: ``name`` is then required and the customer is
         *     created with the booking (no password, no consent: they sign in later with an SMS code to that phone).
         */
        AppointmentCreateRequest: {
            customer_id?: number;
            location_id: number;
            /** @description The new customer's name, required when no customer has the phone (a walk-in). */
            name?: string;
            note?: string;
            /** @description An Uzbek mobile number; separators and a missing +998 are accepted and the value is normalised to E.164 (+998XXXXXXXXX). */
            phone?: string;
            service_id: number;
            specialist_id: number;
            /** Format: date-time */
            start: string;
        };
        /** @description The day-item shape (contract §2.9), also returned by every action endpoint. */
        AppointmentItem: {
            customer: components["schemas"]["CustomerRef"];
            duration_min: number;
            /** Format: date-time */
            end: string;
            id: number;
            location: components["schemas"]["AppointmentClinic"];
            price: number;
            /** Format: date-time */
            requested_at: string;
            requested_via: components["schemas"]["RequestedViaEnum"];
            service_id: number;
            service_name: string;
            service_short_name: string;
            specialist_id: number;
            /** Format: date-time */
            start: string;
            status: components["schemas"]["AppointmentStatusEnum"];
        };
        /**
         * @description ``GET appointments/range/``: ``schedules`` and ``appointments`` are present (non-null) only with
         *     ``detail=full``.
         */
        AppointmentRange: {
            appointments: components["schemas"]["AppointmentItem"][] | null;
            days: components["schemas"]["RangeDay"][];
            /** Format: date */
            from: string;
            schedules: components["schemas"]["RangeSchedule"][] | null;
            specialists: components["schemas"]["RangeSpecialist"][];
            /** Format: date */
            to: string;
        };
        /**
         * @description ``POST appointments/{id}/reschedule/``: ``start`` (same slot rules), optional ``specialist_id`` and
         *     ``service_id`` (required with another specialist: every service belongs to one specialist).
         */
        AppointmentRescheduleRequest: {
            location_id: number;
            /** @description One of the target specialist's active services; required when moving to another specialist, omitted = keep the booked service (and its duration and price). */
            service_id?: number;
            specialist_id?: number;
            /** Format: date-time */
            start: string;
        };
        AppointmentService: {
            id: number;
            readonly name: string;
            readonly short_name: string;
        };
        AppointmentsMeta: {
            slot_step_min: number;
            specialists: components["schemas"]["BookingSpecialist"][];
        };
        AppointmentSpecialist: {
            id: number;
            name: string;
            /**
             * Format: uri
             * @description 1000 px WebP variant.
             */
            readonly photo_medium_url: string | null;
            /**
             * Format: uri
             * @description 400 px WebP variant.
             */
            readonly photo_thumbnail_url: string | null;
            readonly photo_url: string | null;
            role: components["schemas"]["SpecialistRoleEnum"];
            readonly role_label: string;
        };
        /**
         * @description * `requested` - requested
         *     * `confirmed` - confirmed
         *     * `rejected` - rejected
         *     * `attended` - attended
         *     * `cancelled` - cancelled
         * @enum {string}
         */
        AppointmentStatusEnum: "requested" | "confirmed" | "rejected" | "attended" | "cancelled";
        /** @description ``POST notifications/{id}/approve/``: the revision the superuser is looking at. */
        ApproveInputRequest: {
            expected_revision: number;
        };
        AssistantAcceptRequest: {
            /** @description The suggestion keys the person took into the form ([] = none). */
            keys: string[];
        };
        AssistantAcceptResult: {
            job: components["schemas"]["AssistantJob"];
        };
        AssistantApplyItemRequest: {
            key: string;
            value: string;
        };
        AssistantApplyRequest: {
            items: components["schemas"]["AssistantApplyItemRequest"][];
        };
        AssistantApplyResult: {
            applied: string[];
            conflicts: string[];
            job: components["schemas"]["AssistantJob"];
            product: components["schemas"]["Product"];
        };
        /**
         * @description * `professional` - professional
         *     * `clear` - clear
         *     * `natural` - natural
         *     * `seo` - seo
         *     * `shorter` - shorter
         * @enum {string}
         */
        AssistantImproveGoalEnum: "professional" | "clear" | "natural" | "seo" | "shorter";
        /** @description The poller-compatible job: ``state`` / ``error`` like ``Job`` (§2.14), plus the review fields. */
        AssistantJob: {
            applied_keys: string[];
            /** Format: date-time */
            created_at: string;
            created_by: components["schemas"]["Actor"];
            readonly error: components["schemas"]["AssistantJobError"] | null;
            /** Format: date-time */
            finished_at: string | null;
            goal: string;
            id: number;
            image_ids: number[];
            keys: string[];
            languages: string[];
            mode: components["schemas"]["AssistantModeEnum"];
            outcome: components["schemas"]["AssistantJobOutcomeEnum"];
            product_id: number | null;
            /** @description Always null (no progress steps). */
            readonly progress: unknown;
            readonly result: components["schemas"]["AssistantJobResult"] | null;
            /** Format: date-time */
            started_at: string | null;
            state: components["schemas"]["JobStateEnum"];
        };
        AssistantJobCreateRequest: {
            /** @description The admin's current (unsaved) form values: assistant key → value (`""` allowed), at most 150 entries. An image key must name an image of this product and each value fits its key's limit. A key's working value is its draft value when sent, else the saved one: the targets, each suggestion's `current` and the facts the model sees use working values. */
            draft?: {
                [key: string]: string;
            };
            /** @default professional */
            goal: components["schemas"]["AssistantImproveGoalEnum"];
            image_ids?: number[];
            /** @description Snapshot keys (`texts.<lang>.<field>`, `seo.<lang>.<title|description>`, `images.<id>.alt.<lang>`): narrows the automatic choice; required for `improve`. */
            keys?: string[];
            /** @description Target languages; omitted or empty = all three. */
            languages?: components["schemas"]["ContentLanguageEnum"][];
            /**
             * @description `test` is refused (ops console only).
             *
             *     * `fill_missing` - fill_missing
             *     * `languages` - languages
             *     * `improve` - improve
             *     * `photos` - photos
             *     * `test` - test
             * @default fill_missing
             */
            mode: components["schemas"]["AssistantModeEnum"];
        };
        AssistantJobError: {
            code: string;
            message: string;
        };
        /**
         * @description * `pending` - pending
         *     * `applied` - applied
         *     * `partial` - partial
         *     * `discarded` - discarded
         * @enum {string}
         */
        AssistantJobOutcomeEnum: "pending" | "applied" | "partial" | "discarded";
        AssistantJobResult: {
            suggestions: components["schemas"]["AssistantSuggestion"][];
            /** @description Job-level notes by `code`: `rejected` {key, reason} (reason `too_long`, `unsupported_number`, `unsupported_spf`, `empty`, `pos_label`), `skipped` {key, reason} (the model could not write the key truthfully; short English reason), `unchanged` {key} (the suggestion equals the current value), `dropped` {count}, `extracted` {brand, volume} (photos). */
            warnings: {
                [key: string]: unknown;
            }[];
        };
        /**
         * @description * `fill_missing` - fill_missing
         *     * `languages` - languages
         *     * `improve` - improve
         *     * `photos` - photos
         *     * `test` - test
         * @enum {string}
         */
        AssistantModeEnum: "fill_missing" | "languages" | "improve" | "photos" | "test";
        AssistantStart: {
            job: components["schemas"]["AssistantJob"] | null;
            nothing_to_fill: boolean;
        };
        AssistantStatus: {
            /** @description The editor shows the AI assistant button. */
            enabled: boolean;
            /** @description Photos sent with a `photos` request (at most). */
            max_images: number;
        };
        AssistantSuggestion: {
            /** @description Pre-selected in the review (photo suggestions never are). */
            checked: boolean;
            current: string;
            key: string;
            max_length: number;
            /** @description `ai`, or `image` (read from the photos). */
            origin: string;
            suggested: string;
            /** @description `unsupported_claim`, `inci_mismatch`, `confirm_packaging`, `seo_title_long`, `seo_description_long`, `unverified_number` (a small count the data does not state). */
            warnings: string[];
        };
        /**
         * @description * `all` - all
         *     * `segment` - segment
         *     * `customer` - customer
         * @enum {string}
         */
        AudienceTypeEnum: "all" | "segment" | "customer";
        AuditEntry: {
            action: string;
            readonly actor: components["schemas"]["Actor"] | null;
            /** Format: date-time */
            at: string;
            readonly data: unknown;
            id: number;
            /** @description Client IP; null for system rows and always null for ordinary staff (managers and superusers see it). */
            readonly ip: string | null;
            object_id: string;
            object_type: string;
            request_id: string;
        };
        /** @description ``GET audit-log/facets/``: what the audit log shows the signed-in staff member. */
        AuditFacets: {
            /** @description Actions hidden although their prefix is visible (operator-only fixes). */
            hidden_actions: string[];
            /** @description Whether `ip` (and network keys in `data`) are shown. */
            ip_visible: boolean;
            /** @description The visible prefixes limited to the viewer's own entries (staff sign-ins, exports); `auth` entries written by customers stay visible to everyone. */
            own_only_prefixes: string[];
            tier: components["schemas"]["AuditViewerTierEnum"];
            /** @description Action prefixes (the part before the first dot) this viewer sees entries of. */
            visible_prefixes: string[];
        };
        /**
         * @description * `staff` - staff
         *     * `manager` - manager
         *     * `superuser` - superuser
         * @enum {string}
         */
        AuditViewerTierEnum: "staff" | "manager" | "superuser";
        /**
         * @description * `password` - password
         *     * `google` - google
         *     * `facebook` - facebook
         *     * `apple` - apple
         * @enum {string}
         */
        AuthMethodEnum: "password" | "google" | "facebook" | "apple";
        AuthTokens: {
            access: string;
            /** Format: date-time */
            access_expires_at: string;
            customer: components["schemas"]["CustomerMe"];
            device_key: string | null;
            is_new_customer: boolean;
            reactivated: boolean;
            refresh: string;
            /** Format: date-time */
            refresh_expires_at: string;
        };
        AuthTokensOrNextStep: components["schemas"]["AuthTokens"] | components["schemas"]["NextStep"];
        AvailableActions: {
            cancel: boolean;
            /** @description Yandex Delivery: the parcel is returning / returned and its return is not confirmed yet (`POST orders/{id}/confirm-return/`). */
            confirm_return: boolean;
            /** @description Yandex Delivery: `POST orders/{id}/dispatch/` would be accepted now (false for BTS). */
            dispatch: boolean;
            retry_shipment: boolean;
            transitions: components["schemas"]["OrderStatusEnum"][];
        };
        /** @description Contract §2.5 ``Banner``; instances come from ``selectors.banner_queryset()``. */
        Banner: {
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            ends_at: string | null;
            id: number;
            /**
             * Format: uri
             * @description 1000 px WebP variant.
             */
            readonly image_medium_url: string;
            /**
             * Format: uri
             * @description 400 px WebP variant.
             */
            readonly image_thumbnail_url: string;
            /** Format: uri */
            readonly image_url: string;
            is_active: boolean;
            readonly link: components["schemas"]["BannerLink"];
            position: number;
            /** Format: date-time */
            starts_at: string | null;
            readonly title: components["schemas"]["I18nText80"];
            /** Format: date-time */
            updated_at: string;
        };
        BannerFormRequest: {
            /** Format: date-time */
            ends_at?: string | null;
            /** Format: binary */
            image?: string;
            is_active?: boolean;
            "link.category"?: string | null;
            "link.kind"?: components["schemas"]["BannerLinkKindEnum"];
            "link.product_id"?: number | null;
            "link.url"?: string | null;
            /** Format: date-time */
            starts_at?: string | null;
            "title.en"?: string;
            "title.ru"?: string;
            "title.uz": string;
        };
        BannerLink: {
            category?: string | null;
            kind?: components["schemas"]["BannerLinkKindEnum"];
            product_id?: number | null;
            url?: string | null;
        };
        /**
         * @description * `none` - none
         *     * `product` - product
         *     * `category` - category
         *     * `url` - url
         * @enum {string}
         */
        BannerLinkKindEnum: "none" | "product" | "category" | "url";
        BannerLinkRequest: {
            category?: string | null;
            kind?: components["schemas"]["BannerLinkKindEnum"];
            product_id?: number | null;
            url?: string | null;
        };
        BannerResults: {
            results: components["schemas"]["Banner"][];
        };
        /** @description ``title`` of ``PATCH banners/{id}/``: any subset of the three leaves (merged into the stored title). */
        BannerTitlePatchRequest: {
            en?: string;
            ru?: string;
            uz?: string;
        };
        /**
         * @description * `delta` - delta
         *     * `full` - full
         * @enum {string}
         */
        BillzImportModeEnum: "delta" | "full";
        /** @description Body of ``POST integrations/billz/import/``: ``{}`` or ``{"mode": "delta"|"full"}``. */
        BillzImportRequest: {
            /** @default delta */
            mode: components["schemas"]["BillzImportModeEnum"];
        };
        BillzStatus: {
            connected: boolean;
            /** Format: date-time */
            last_sync_at: string | null;
        };
        /** @enum {unknown} */
        BlankEnum: "";
        /** @description An absolute busy / off range of the specialist (``label`` null = none). */
        BlockedPeriod: {
            /** Format: date-time */
            created_at: string;
            created_by: components["schemas"]["Actor"] | null;
            /** Format: date-time */
            end: string;
            id: number;
            kind: components["schemas"]["BlockKindEnum"];
            readonly label: string | null;
            /** Format: date-time */
            start: string;
        };
        /** @description Body of ``POST specialists/{id}/blocks/``. */
        BlockedPeriodCreateRequest: {
            /** Format: date-time */
            end: string;
            kind: components["schemas"]["BlockKindEnum"];
            label?: string | null;
            /** Format: date-time */
            start: string;
        };
        /**
         * @description * `busy` - busy
         *     * `off` - off
         * @enum {string}
         */
        BlockKindEnum: "busy" | "off";
        BookingRequest: {
            location_id: number;
            note?: string | null;
            service_id: number;
            specialist_id: number;
            /** Format: date-time */
            start: string;
        };
        /** @description One bookable service of a specialist: the snapshot an admin booking would take (contract §2.9 meta). */
        BookingService: {
            duration_min: number;
            id: number;
            name: string;
            price: number;
            short_name: string;
        };
        BookingSpecialist: {
            id: number;
            readonly locations: components["schemas"]["AppointmentClinic"][];
            name: string;
            role: components["schemas"]["SpecialistRoleEnum"];
            services: components["schemas"]["BookingService"][];
        };
        /** @description ``NotificationRecord.tests[]``: one test push of a revision to one test device. */
        CampaignTest: {
            /** Format: date-time */
            confirmed_at: string | null;
            confirmed_by: components["schemas"]["Actor"] | null;
            /** @description The registry label; the tester's phone stays in the superuser-only registry. */
            device_label: string;
            fcm_error: string;
            /** @description null while the push is in flight; true = FCM accepted it. */
            fcm_ok: boolean | null;
            id: number;
            revision: number;
            /** Format: date-time */
            sent_at: string;
            sent_by: components["schemas"]["Actor"] | null;
            test_device_id: number | null;
        };
        Cancellation: {
            note: string | null;
            reason: components["schemas"]["CancellationReasonEnum"];
        };
        /**
         * @description * `reservation_expired` - reservation_expired
         *     * `admin` - admin
         *     * `customer_request` - customer_request
         * @enum {string}
         */
        CancellationReasonEnum: "reservation_expired" | "admin" | "customer_request";
        CancelOrderRequest: {
            reason: string;
        };
        CancelRequest: {
            reason?: string | null;
        };
        Capabilities: {
            /** @description Password links can be e-mailed (`delivery` `email_link` / `both`, `staff/{id}/send-password-link/`, `auth/password-link/`); `false` when the admin panel URL is not configured or e-mail is not live under the production settings: the UI shows the option disabled. */
            staff_email_invite: boolean;
        };
        /**
         * @description * `ok` - ok
         *     * `insufficient` - insufficient
         *     * `out_of_stock` - out_of_stock
         *     * `unavailable` - unavailable
         * @enum {string}
         */
        CartLineStatusEnum: "ok" | "insufficient" | "out_of_stock" | "unavailable";
        /**
         * @description ``POST customers/{id}/cashback-adjustments/`` body (OpenAPI shape).
         *
         *     The view validates ``direction`` here and hands ``amount`` / ``reason`` as received to the service, which
         *     runs the contract checks in order with the table's messages.
         */
        CashbackAdjustmentRequest: {
            amount: number;
            direction: components["schemas"]["AdjustmentDirectionEnum"];
            reason: string;
        };
        /** @description 201: the new ``adjustment`` entry, the balance after it and ``available`` (balance − active holds). */
        CashbackAdjustmentResult: {
            available: number;
            balance: number;
            entry: components["schemas"]["LedgerEntry"];
        };
        /** @description One band of the active policy: ``from`` inclusive, ``to`` exclusive | null. */
        CashbackBand: {
            from: number;
            /** Format: decimal */
            percent: string;
            to: number | null;
        };
        /**
         * @description * `none` - none
         *     * `credited` - credited
         *     * `reversed` - reversed
         * @enum {string}
         */
        CashbackEarnedStateEnum: "none" | "credited" | "reversed";
        CashbackHold: {
            amount: number;
            /** Format: date-time */
            expires_at: string;
            state: components["schemas"]["CashbackHoldStateEnum"];
        };
        CashbackHoldItem: {
            amount: number;
            /**
             * Format: date-time
             * @description Effective expiry: the reservation end, plus the in-flight grace while a transaction attached in time is still open.
             */
            expires_at: string;
            order_id: number;
        };
        /**
         * @description * `active` - active
         *     * `captured` - captured
         *     * `released` - released
         * @enum {string}
         */
        CashbackHoldStateEnum: "active" | "captured" | "released";
        /** @description The band above the current one: what is left to reach it and the progress (0..1). */
        CashbackNextTier: {
            from: number;
            /** Format: decimal */
            percent: string;
            /** Format: double */
            progress: number;
            remaining: number;
        };
        /** @description ``GET cashback/policy/``: the active and scheduled versions, every version and the suggested start. */
        CashbackPolicy: {
            active: components["schemas"]["PolicyVersion"] | null;
            /** Format: date-time */
            next_effective_from: string;
            scheduled: components["schemas"]["PolicyVersion"] | null;
            versions: components["schemas"]["PolicyVersion"][];
        };
        CashbackSummary: {
            /** @description balance − active holds; may be negative (L5). */
            available: number;
            balance: number;
            earn_on_cashback_paid: boolean;
            held: number;
            holds: components["schemas"]["CashbackHoldItem"][];
            lifetime_total: number;
            negative: boolean;
            next_tier: components["schemas"]["CashbackNextTier"] | null;
            qr_ttl_seconds: number;
            tier: components["schemas"]["CashbackBand"] | null;
            tiers: components["schemas"]["CashbackBand"][];
        };
        /** @description Contract §2.7 tier: ``from`` inclusive, ``to`` exclusive | null, 2-dp percent. */
        CashbackTier: {
            from: number;
            id: number;
            /** Format: decimal */
            percent: string;
            to: number | null;
        };
        /** @description One submitted tier. ``percent`` is a decimal string; its range and precision are the policy rules (``out_of_range`` / ``max_decimal_places``) checked by ``create_policy_version``. */
        CashbackTierInputRequest: {
            /** Format: int64 */
            from: number;
            /** Format: decimal */
            percent: string;
            /** Format: int64 */
            to?: number | null;
        };
        /** @description Contract §2.4 ``Category``; instances come from ``selectors.category_queryset()``. */
        Category: {
            /** Format: date-time */
            created_at: string;
            /**
             * Format: uri
             * @description 1000 px WebP variant.
             */
            readonly image_medium_url: string | null;
            /**
             * Format: uri
             * @description 400 px WebP variant.
             */
            readonly image_thumbnail_url: string | null;
            /** Format: uri */
            readonly image_url: string | null;
            is_active: boolean;
            readonly name: components["schemas"]["I18nText60"];
            position: number;
            product_count: number;
            readonly seo: components["schemas"]["SeoTexts"];
            readonly seo_status: components["schemas"]["SeoStatus"];
            slug: string;
            /** Format: date-time */
            updated_at: string;
        };
        CategoryFormRequest: {
            /** Format: binary */
            image?: string;
            is_active?: boolean;
            "name.en"?: string;
            "name.ru"?: string;
            "name.uz": string;
            "seo.en.description"?: string;
            "seo.en.title"?: string;
            "seo.ru.description"?: string;
            "seo.ru.title"?: string;
            "seo.uz.description"?: string;
            "seo.uz.title"?: string;
            slug: string;
        };
        /**
         * @description Contract §2.4 ``name``: ``uz`` 2..60 required; ``ru`` / ``en`` ≤ 60 optional (missing on create → "").
         *
         *     The core ``i18n_text`` shape requires every language; the catalog write shapes only require Uzbek.
         */
        CategoryNameRequest: {
            /** @default  */
            en: string;
            /** @default  */
            ru: string;
            uz: string;
        };
        CategoryResults: {
            results: components["schemas"]["Category"][];
        };
        /**
         * @description ``POST categories/`` and ``PATCH categories/{slug}/`` (``partial``; ``slug`` is then ``read_only``).
         *
         *     JSON, or multipart with the dotted names ``name.uz``, ``name.ru``, ``name.en`` next to ``slug``,
         *     ``is_active`` and the optional file part ``image`` (gap ADM-5.1; the view reads the file and un-dots the
         *     names with ``views.form_to_nested``).
         */
        CategoryWriteRequest: {
            /** @default true */
            is_active: boolean;
            name: components["schemas"]["CategoryNameRequest"];
            seo?: components["schemas"]["SeoTextsRequest"];
            slug: string;
        };
        ChangePasswordRequest: {
            current_password: string;
            new_password: string;
        };
        City: {
            code: string;
            name: string;
        };
        /** @description An admin-managed clinic branch. */
        ClinicLocation: {
            readonly address: components["schemas"]["I18nText300"];
            readonly directions: components["schemas"]["I18nText500"];
            id: number;
            is_active: boolean;
            /** Format: double */
            readonly latitude: number | null;
            /** Format: double */
            readonly longitude: number | null;
            readonly name: components["schemas"]["I18nText120"];
            readonly phone: string | null;
            /** Format: date-time */
            updated_at: string;
        };
        /** @description Texts merge leaf by leaf. Coordinates must be set or cleared together. */
        ClinicLocationCreateRequest: {
            address: components["schemas"]["LocationCreateAddressRequest"];
            directions?: components["schemas"]["LocationDirectionsRequest"];
            is_active?: boolean;
            /** Format: double */
            latitude?: number | null;
            /** Format: double */
            longitude?: number | null;
            name: components["schemas"]["LocationCreateNameRequest"];
            /** @description An Uzbek mobile number; separators and a missing +998 are accepted and the value is normalised to E.164 (+998XXXXXXXXX). */
            phone?: string | null;
        };
        ClinicLocations: {
            results: components["schemas"]["ClinicLocation"][];
        };
        /**
         * @description The admin ``ClinicService``: one service of one specialist, with the price and duration a booking
         *     snapshots (``is_active: false`` = not offered to customers or in the booking dialogs).
         */
        ClinicService: {
            category: components["schemas"]["ServiceCategoryEnum"];
            /** Format: date-time */
            created_at: string;
            readonly description: components["schemas"]["I18nText2000"];
            duration_min: number;
            id: number;
            is_active: boolean;
            readonly name: components["schemas"]["I18nText120"];
            position: number;
            price: number;
            readonly short_name: components["schemas"]["I18nText40"];
            specialist_id: number;
            /** Format: date-time */
            updated_at: string;
        };
        /**
         * @description Body of ``POST …/services/`` and (``partial``) ``PATCH …/services/{id}/`` of one specialist (texts
         *     merge leaf by leaf). ``category`` defaults from the specialist's role on create.
         */
        ClinicServiceWriteRequest: {
            /**
             * @description Defaults from the specialist's role on create.
             *
             *     * `dermatology` - dermatology
             *     * `cosmetology` - cosmetology
             */
            category?: components["schemas"]["ServiceCategoryEnum"];
            description?: components["schemas"]["ServiceDescriptionRequest"];
            /** @description Minutes, a multiple of 5 (5 … 480). */
            duration_min: number;
            /** @default true */
            is_active: boolean;
            name: components["schemas"]["ServiceNameRequest"];
            /** @description Order within the specialist's services; appended last on create. */
            position?: number;
            /** @description So'm, 0 … 100 000 000; snapshotted by every booking. */
            price: number;
            short_name?: components["schemas"]["ServiceShortNameRequest"];
        };
        /**
         * @description The admin ``ClinicSpecialist``; instances come from ``selectors.specialist_queryset()``.
         *
         *     ``upcoming_appointments`` (``requested`` / ``confirmed`` appointments starting now or later) comes from
         *     the view's context (``upcoming``), counted once per page.
         */
        ClinicSpecialist: {
            /** @description The account that owns the profile. */
            account: components["schemas"]["SpecialistAccount"];
            readonly bio: components["schemas"]["I18nText2000"];
            /** Format: date-time */
            created_at: string;
            experience_years: number | null;
            id: number;
            is_active: boolean;
            /** @description `null` while a draft has no clinic. */
            location_id: number | null;
            readonly location_ids: number[];
            name: string;
            /**
             * Format: uri
             * @description 1000 px WebP variant.
             */
            readonly photo_medium_url: string | null;
            /**
             * Format: uri
             * @description 400 px WebP variant.
             */
            readonly photo_thumbnail_url: string | null;
            /** Format: uri */
            readonly photo_url: string | null;
            position: number;
            /** @description What keeps the profile from being published (`[]` = ready): account, name, discipline, bio, photo, clinic, service, availability. */
            readonly publish_blockers: components["schemas"]["PublishBlockersEnum"][];
            readonly qualifications: components["schemas"]["I18nText2000"];
            /**
             * @description `""` while a draft has none.
             *
             *     * `dermatologist` - dermatologist
             *     * `cosmetologist` - cosmetologist
             */
            role: components["schemas"]["SpecialistRoleEnum"] | components["schemas"]["BlankEnum"];
            /** @description Every own service, inactive ones included, by position. */
            services: components["schemas"]["ClinicService"][];
            slot_step_min: number;
            /** @description The website URL segment (B-W1): unique, editable. */
            slug: string;
            readonly upcoming_appointments: number;
            /** Format: date-time */
            updated_at: string;
            working_hours: components["schemas"]["WorkingDay"][];
        };
        CodeIssue: {
            attempts: number;
            /** @description The code went by e-mail; else null. */
            email_mask: string | null;
            expires_in: number;
            length: number;
            /** @description The code went by SMS; else null. */
            phone_mask: string | null;
            purpose: components["schemas"]["OtpPurposeEnum"];
            resend_in: number;
        };
        /** @description ``POST orders/{id}/confirm-return/`` (Yandex Delivery plan §3.8): the parcel is physically back. */
        ConfirmReturnRequest: {
            /**
             * @description Optional (≤ 1000): the parcel's condition; becomes the `return_pending` resolution note.
             * @default
             */
            note: string;
        };
        ConsentRequest: {
            terms_version: string;
        };
        ConsentState: {
            /** Format: date-time */
            accepted_at: string | null;
            current_version: string | null;
            terms_version: string | null;
            update_required: boolean;
        };
        /**
         * @description * `uz` - uz
         *     * `ru` - ru
         *     * `en` - en
         * @enum {string}
         */
        ContentLanguageEnum: "uz" | "ru" | "en";
        CustomerAddress: {
            city_code: string;
            comment: string;
            /** Format: date-time */
            created_at: string;
            id: number;
            is_default: boolean;
            label: string;
            /** Format: double */
            latitude: number | null;
            /** Format: double */
            longitude: number | null;
            region_code: string;
            text: string;
            /** Format: date-time */
            updated_at: string;
        };
        CustomerAddressList: {
            results: components["schemas"]["CustomerAddress"][];
        };
        /** @description C§2.11 ``Appointment`` of the customer audience (``note`` is the customer's own note). */
        CustomerAppointment: {
            readonly can_cancel: boolean;
            /** Format: date-time */
            cancelled_at: string | null;
            readonly cancelled_by: (components["schemas"]["AppointmentCancelledByEnum"] | components["schemas"]["NullEnum"]) | null;
            /** Format: date-time */
            confirmed_at: string | null;
            duration_min: number;
            /** Format: date-time */
            end: string;
            id: number;
            location: components["schemas"]["Location"];
            readonly note: string | null;
            price: number;
            /** Format: date-time */
            requested_at: string;
            service: components["schemas"]["AppointmentService"];
            specialist: components["schemas"]["AppointmentSpecialist"];
            /** Format: date-time */
            start: string;
            status: components["schemas"]["AppointmentStatusEnum"];
            readonly status_label: string;
        };
        CustomerBanner: {
            id: number;
            image_height: number;
            /**
             * Format: uri
             * @description 1000 px WebP variant.
             */
            image_medium_url: string | null;
            /**
             * Format: uri
             * @description 400 px WebP variant.
             */
            image_thumbnail_url: string | null;
            /** Format: uri */
            image_url: string | null;
            image_width: number;
            link: components["schemas"]["CustomerBannerLink"];
            title: string;
        };
        CustomerBannerLink: {
            category: string | null;
            kind: components["schemas"]["BannerLinkKindEnum"];
            product_id: number | null;
            /** @description Kind `url`: the https link the app opens; else null. */
            url: string | null;
        };
        CustomerBannerList: {
            results: components["schemas"]["CustomerBanner"][];
        };
        CustomerCancellation: {
            label: string;
            reason: components["schemas"]["CancellationReasonEnum"];
        };
        /** @description Contract §2.6 ``CustomerCard``. */
        CustomerCard: {
            address: string | null;
            available: number;
            balance: number;
            /** Format: date-time */
            deleted_at: string | null;
            device: components["schemas"]["CustomerDevice"] | null;
            devices: components["schemas"]["CustomerDeviceRow"][];
            /** @description Verified e-mail address | null. */
            email: string | null;
            groups: components["schemas"]["CustomerGroup"][];
            held: number;
            id: number;
            language: components["schemas"]["ContentLanguageEnum"];
            ledger: components["schemas"]["LedgerEntry"][];
            name: string;
            online_orders: components["schemas"]["OnlineOrders"];
            /** @description Null for an account without a phone yet. */
            phone: string | null;
            purchases: components["schemas"]["Purchase"][];
            /** Format: date-time */
            registered_at: string;
            status: components["schemas"]["CustomerStatusEnum"];
            tier: components["schemas"]["CustomerTier"] | null;
            totals: components["schemas"]["CustomerTotals"];
            upcoming_appointments: number;
        };
        CustomerCart: {
            cashback: components["schemas"]["CustomerCartCashback"];
            checkout_order?: components["schemas"]["CustomerOrderDetail"] | null;
            has_problems: boolean;
            item_count: number;
            items: components["schemas"]["CustomerCartLine"][];
            items_subtotal: number;
            last_change: components["schemas"]["CustomerCartChange"] | null;
            promo_subtotal: number;
            quantity_total: number;
            /** Format: date-time */
            updated_at: string | null;
        };
        CustomerCartAddRequest: {
            product_id: number;
            /** @default 1 */
            quantity: number;
        };
        CustomerCartCashback: {
            available: number;
            max_usable_pickup: number;
        };
        CustomerCartChange: {
            max_reached: boolean;
            product_id: number;
            quantity: number;
            requested_quantity: number;
        };
        CustomerCartLine: {
            available: number;
            line_total: number;
            /** @description 1000 px WebP variant. */
            main_image_medium_url: string | null;
            /** @description 400 px WebP variant. */
            main_image_thumbnail_url: string | null;
            main_image_url: string | null;
            max_quantity: number;
            max_reached: boolean;
            name: string;
            previous_price: number | null;
            price_changed: boolean;
            product_id: number;
            promo: boolean;
            quantity: number;
            status: components["schemas"]["CartLineStatusEnum"];
            unit_price: number;
            volume: string;
        };
        CustomerCategory: {
            /**
             * @description Language of `name`: the requested language, or `uz` when it fell back to Uzbek.
             *
             *     * `uz` - uz
             *     * `ru` - ru
             *     * `en` - en
             */
            content_language: components["schemas"]["ContentLanguageEnum"];
            /**
             * Format: uri
             * @description 1000 px WebP variant.
             */
            image_medium_url: string | null;
            /**
             * Format: uri
             * @description 400 px WebP variant.
             */
            image_thumbnail_url: string | null;
            /** Format: uri */
            image_url: string | null;
            name: string;
            product_count: number;
            seo_description: string;
            seo_title: string;
            slug: string;
            /** Format: date-time */
            updated_at: string;
        };
        CustomerCategoryList: {
            results: components["schemas"]["CustomerCategory"][];
        };
        CustomerCheckoutRequest: {
            address_id?: number | null;
            /** @default 0 */
            cashback_to_use: number;
            /** @default  */
            customer_note: string;
            /**
             * Format: uuid
             * @description A Yandex `quote_id` from `delivery/calculate/`; without it delivery ships by BTS.
             */
            delivery_quote_id?: string | null;
            expected_total: number;
            fulfilment: components["schemas"]["FulfilmentMethodEnum"];
            payment_provider: components["schemas"]["PaymentProviderEnum"];
        };
        CustomerDeliveryCalculateRequest: {
            address_id?: number | null;
            cashback_to_use?: number | null;
            city_code?: string | null;
            /**
             * @description Preferred Yandex method (implies `delivery_provider=yandex`).
             *
             *     * `standard` - standard
             *     * `express` - express
             */
            delivery_method?: (components["schemas"]["DeliveryMethodEnum"] | components["schemas"]["NullEnum"]) | null;
            /**
             * @description Preferred carrier; the answer falls back to the default option when it is unavailable.
             *
             *     * `bts` - bts
             *     * `yandex` - yandex
             */
            delivery_provider?: (components["schemas"]["DeliveryProviderEnum"] | components["schemas"]["NullEnum"]) | null;
            fulfilment: components["schemas"]["FulfilmentMethodEnum"];
            region_code?: string | null;
            /** @description List every delivery option (Yandex Standard / Express, BTS) with its fee, ETA and quote. */
            with_options?: boolean | null;
        };
        CustomerDeliveryOption: {
            available: boolean;
            /** Format: date-time */
            eta_from: string | null;
            /** Format: date-time */
            eta_to: string | null;
            expected_total: number | null;
            /** Format: date-time */
            expires_at: string | null;
            /** @description so'm; null when unavailable (never invented). */
            fee: number | null;
            label: string;
            method: (components["schemas"]["DeliveryMethodEnum"] | components["schemas"]["NullEnum"]) | null;
            provider: components["schemas"]["DeliveryProviderEnum"];
            /**
             * Format: uuid
             * @description Pass to checkout as `delivery_quote_id`.
             */
            quote_id: string | null;
            /** @description The window starts at a later warehouse opening. */
            scheduled: boolean;
            unavailable_reason: (components["schemas"]["DeliveryUnavailableReasonEnum"] | components["schemas"]["NullEnum"]) | null;
        };
        /**
         * @description ``DeliveryQuote``: the released keys, plus — only when the request sent ``with_options``,
         *     ``delivery_provider`` or ``delivery_method`` — the selected option and every option.
         */
        CustomerDeliveryQuote: {
            cashback_max: number;
            cashback_to_use: number;
            city_code: string | null;
            delivery_fee: number;
            expected_total: number;
            fulfilment: components["schemas"]["FulfilmentMethodEnum"];
            items_subtotal: number;
            method?: (components["schemas"]["DeliveryMethodEnum"] | components["schemas"]["NullEnum"]) | null;
            options?: components["schemas"]["CustomerDeliveryOption"][];
            pickup_address: string | null;
            provider?: (components["schemas"]["DeliveryProviderEnum"] | components["schemas"]["NullEnum"]) | null;
            /** Format: date-time */
            quote_expires_at?: string | null;
            /** Format: uuid */
            quote_id?: string | null;
            /** Format: date-time */
            quoted_at: string;
            region_code: string | null;
            weight_g: number | null;
        };
        CustomerDetailItem: {
            /** @description 1000 px WebP variant. */
            image_medium_url: string | null;
            /** @description 400 px WebP variant. */
            image_thumbnail_url: string | null;
            image_url: string | null;
            line_total: number;
            name: string;
            product_id: number;
            promo: boolean;
            quantity: number;
            unit_price: number;
        };
        CustomerDetailPayment: {
            amount: number;
            /** Format: date-time */
            confirmed_at: string | null;
            in_progress: boolean;
            in_progress_label: string | null;
            provider: components["schemas"]["PaymentProviderEnum"];
            status: components["schemas"]["PaymentStatusEnum"];
            status_label: string;
        };
        /** @description The card's current ``device``: the most recently active of the customer's active devices. */
        CustomerDevice: {
            app_version: string;
            /** Format: date-time */
            last_active_at: string;
            model: string;
            os: string;
            platform: components["schemas"]["OrderChannelEnum"];
            push_enabled: boolean;
        };
        /**
         * @description One of the card's ``devices`` (gap ADM-8.1): every installation, active ones first; never the FCM
         *     token, the device key or the Firebase installation id.
         */
        CustomerDeviceRow: {
            app_version: string;
            /**
             * Format: date-time
             * @description When the installation first signed in.
             */
            created_at: string;
            id: number;
            /** @description `false` once no session is left on it (a logout, a session signed out, a password reset or change elsewhere) or after the deletion (B-W1: several devices may be active). */
            is_active: boolean;
            /** Format: date-time */
            last_active_at: string;
            model: string;
            os: string;
            platform: components["schemas"]["OrderChannelEnum"];
            push_enabled: boolean;
        };
        /** @description The customer envelope: the admin keys plus ``details`` (always present, ``null`` by default). */
        CustomerErrorEnvelope: {
            code: string;
            /** @description Code-specific object (§1.6) or null. */
            details: unknown;
            errors: components["schemas"]["ErrorItem"][];
            /** @description Localized (Accept-Language → the customer's language → uz). */
            message: string;
            request_id: string;
        };
        CustomerGroup: {
            id: number;
            name: string;
        };
        /**
         * @description Contract §2.6 ``CustomerListItem``: the one renderer of ``GET customers/`` and of segment members.
         *
         *     Rows carry the ``loyalty.selectors.list_annotations()`` values (``lifetime_total``, ``balance``,
         *     ``percent``, ``online_orders_count``).
         */
        CustomerListItem: {
            balance: number;
            /** @description Verified e-mail address | null. */
            email: string | null;
            id: number;
            lifetime_total: number;
            name: string;
            online_orders_count: number;
            /** Format: decimal */
            percent: string | null;
            /** @description Null for an account without a phone yet. */
            phone: string | null;
            /** Format: date-time */
            registered_at: string;
            status: components["schemas"]["CustomerStatusEnum"];
        };
        /**
         * @description ``phone`` **or** ``email`` (hybrid identity, customer contract §2.1): exactly one per call. Neither →
         *     ``phone`` ``required`` (``field.identifier_required``); both → ``email`` ``invalid``
         *     (``field.identifier_ambiguous``). ``validated_data["identifier"]`` is the one given (an address holds
         *     ``@``, a phone never does).
         */
        CustomerLoginRequest: {
            email?: string | null;
            password: string;
            phone?: string | null;
            verification_token?: string | null;
        };
        /**
         * @description ``auth/logout/`` (B-W1): ``current`` = this session, ``others`` = every other session, ``all`` =
         *     everywhere.
         */
        CustomerLogoutRequest: {
            refresh: string;
            /** @default current */
            scope: components["schemas"]["LogoutScopeEnum"];
        };
        CustomerMe: {
            consent: components["schemas"]["ConsentState"];
            default_address: components["schemas"]["CustomerAddress"] | null;
            /** @description Verified e-mail address (lower case) | null. */
            email: string | null;
            has_password: boolean;
            id: number;
            /**
             * Format: uri
             * @description 1000 px WebP variant.
             */
            image_medium_url: string | null;
            /**
             * Format: uri
             * @description 400 px WebP variant.
             */
            image_thumbnail_url: string | null;
            /** Format: uri */
            image_url: string | null;
            language: components["schemas"]["ContentLanguageEnum"];
            linked_providers: components["schemas"]["CustomerSocialProviderEnum"][];
            name: string;
            /** @description Verified phone; null until attached (checkout, pay, booking, QR need it). */
            phone: string | null;
            push_enabled: boolean;
            /** Format: date-time */
            registered_at: string;
        };
        CustomerOrderActions: {
            cancel: boolean;
            pay: boolean;
            reorder: boolean;
        };
        CustomerOrderCashback: {
            earned: number;
            earned_state: components["schemas"]["CashbackEarnedStateEnum"];
            used: number;
        };
        /** @description The carrier view of a delivery order (plan §3.4); a BTS order has only ``provider``. */
        CustomerOrderDelivery: {
            courier_name: string | null;
            courier_vehicle: string | null;
            /** Format: date-time */
            eta_from: string | null;
            /** Format: date-time */
            eta_to: string | null;
            method: (components["schemas"]["DeliveryMethodEnum"] | components["schemas"]["NullEnum"]) | null;
            method_label: string | null;
            provider: components["schemas"]["DeliveryProviderEnum"];
            stage: (components["schemas"]["ShipmentStageEnum"] | components["schemas"]["NullEnum"]) | null;
            stage_label: string | null;
            tracking_url: string | null;
        };
        CustomerOrderDetail: {
            actions: components["schemas"]["CustomerOrderActions"];
            address: string | null;
            address_comment: string | null;
            cancellation: components["schemas"]["CustomerCancellation"] | null;
            cashback: components["schemas"]["CustomerOrderCashback"];
            cashback_used: number;
            /** Format: date-time */
            created_at: string;
            customer_note: string | null;
            /** @description null for pickup. */
            delivery: components["schemas"]["CustomerOrderDelivery"] | null;
            delivery_fee: number;
            fulfilment: components["schemas"]["FulfilmentMethodEnum"];
            fulfilment_label: string;
            id: number;
            item_count: number;
            items: components["schemas"]["CustomerDetailItem"][];
            items_subtotal: number;
            /** Format: date-time */
            pay_by: string | null;
            payment: components["schemas"]["CustomerDetailPayment"];
            pickup_address: string | null;
            preview_images: string[];
            /** @description `preview_images` as their 400 px WebP variants, same order. */
            preview_thumbnail_images: string[];
            progress: components["schemas"]["CustomerProgressStep"][];
            promo_subtotal: number;
            refund: components["schemas"]["CustomerRefund"] | null;
            shipment: components["schemas"]["CustomerShipment"] | null;
            status: components["schemas"]["OrderStatusEnum"];
            status_label: string;
            timeline: components["schemas"]["CustomerTimelineEntry"][];
            total: number;
            tracking_number: string | null;
        };
        CustomerOrderSummary: {
            /** Format: date-time */
            created_at: string;
            /** @description null for pickup. */
            delivery: components["schemas"]["CustomerOrderDelivery"] | null;
            fulfilment: components["schemas"]["FulfilmentMethodEnum"];
            id: number;
            item_count: number;
            /** Format: date-time */
            pay_by: string | null;
            payment: components["schemas"]["CustomerSummaryPayment"];
            preview_images: string[];
            /** @description `preview_images` as their 400 px WebP variants, same order. */
            preview_thumbnail_images: string[];
            status: components["schemas"]["OrderStatusEnum"];
            status_label: string;
            total: number;
            tracking_number: string | null;
        };
        CustomerPayLink: {
            account_ref: string;
            amount: number;
            app_url: string | null;
            order_id: number;
            /** Format: date-time */
            pay_by: string;
            payment_id: number;
            provider: components["schemas"]["PaymentProviderEnum"];
            return_url: string;
            web_url: string;
        };
        CustomerPayRequest: {
            provider?: (components["schemas"]["PaymentProviderEnum"] | components["schemas"]["NullEnum"]) | null;
        };
        CustomerProductImage: {
            /** @description Alt text in this language (else Uzbek); without one, the product name. */
            alt: string;
            id: number;
            /**
             * Format: uri
             * @description 1000 px WebP variant.
             */
            medium_url: string;
            position: number;
            /**
             * Format: uri
             * @description 400 px WebP variant.
             */
            thumbnail_url: string;
            /** Format: uri */
            url: string;
        };
        CustomerProgressStep: {
            /** Format: date-time */
            at: string | null;
            label: string;
            state: components["schemas"]["ProgressStateEnum"];
            step: components["schemas"]["ProgressStepEnum"];
        };
        /**
         * @description ``CustomerRef = {"id", "name", "phone", "email"}`` (contract §2.0); ``name`` is ``""`` once the
         *     customer is deleted (scrubbed).
         */
        CustomerRef: {
            email: string | null;
            id: number;
            name: string;
            phone: string | null;
        };
        CustomerRefreshRequest: {
            refresh: string;
        };
        CustomerRefund: {
            amount: number;
            /** Format: date-time */
            completed_at: string | null;
            /** Format: date-time */
            requested_at: string;
            state: components["schemas"]["CustomerRefundStateEnum"];
            state_label: string;
        };
        /**
         * @description * `in_progress` - in_progress
         *     * `completed` - completed
         * @enum {string}
         */
        CustomerRefundStateEnum: "in_progress" | "completed";
        CustomerReorderRequest: {
            /** @default false */
            cancel_unpaid: boolean;
        };
        /** @description One signed-in device of the customer (``CustomerSession``). */
        CustomerSession: {
            /**
             * Format: date-time
             * @description The sign-in.
             */
            created_at: string;
            /** @description This request's own session. */
            current: boolean;
            /** @description "Chrome (Windows)", "Glow Derma iOS (iPhone 15)". */
            device: string;
            /** Format: uuid */
            id: string;
            /** @description "Tashkent, Tashkent, UZ"; "—" when unknown. */
            location: string;
            platform: (components["schemas"]["OrderChannelEnum"] | components["schemas"]["NullEnum"]) | null;
            /**
             * Format: date-time
             * @description The last activity (recorded at most every 5 minutes).
             */
            updated_at: string;
        };
        CustomerShipment: {
            carrier: string;
            tracking_number: string;
            tracking_url: string | null;
        };
        /**
         * @description * `google` - google
         *     * `facebook` - facebook
         *     * `apple` - apple
         * @enum {string}
         */
        CustomerSocialProviderEnum: "google" | "facebook" | "apple";
        /**
         * @description * `active` - active
         *     * `deleted` - deleted
         * @enum {string}
         */
        CustomerStatusEnum: "active" | "deleted";
        CustomerSummaryPayment: {
            in_progress: boolean;
            provider: components["schemas"]["PaymentProviderEnum"];
            status: components["schemas"]["PaymentStatusEnum"];
            status_label: string;
        };
        CustomerTier: {
            next: components["schemas"]["NextTier"] | null;
            /** Format: decimal */
            percent: string;
            policy_version: number;
        };
        CustomerTimelineEntry: {
            /** Format: date-time */
            at: string;
            subtitle: string | null;
            title: string;
            type: components["schemas"]["TimelineTypeEnum"];
        };
        CustomerTotals: {
            lifetime: number;
            online: number;
            store: number;
        };
        Dashboard: {
            attention: components["schemas"]["DashboardAttention"];
            bucket: components["schemas"]["DashboardBucketEnum"];
            buckets: components["schemas"]["DashboardBucket"][];
            /** Format: date */
            from: string;
            fulfilment: components["schemas"]["DashboardFulfilment"];
            /** Format: date-time */
            generated_at: string;
            previous_period_orders: number;
            range: components["schemas"]["DashboardRangeEnum"];
            stats: components["schemas"]["DashboardStats"];
            /** Format: date */
            to: string;
        };
        DashboardAttention: {
            bts_failed: number;
            /** @description The last BTS polling run tracked no parcel or stopped on transport failures (M2). */
            bts_polling_failing: boolean;
            /** @description No cashback policy version is in force now (none exists, or only a future one): purchases earn no cashback until one starts. */
            cashback_policy_missing: boolean;
            new_from_billz: number;
            /** Format: date-time */
            next_appointment_at: string | null;
            pending_appointments: number;
            refunds_needing_action: number;
            /** @description Yandex Delivery is live and its last status poll or price check failed (always false in fake mode). */
            yandex_failing: boolean;
        };
        DashboardBucket: {
            orders: number;
            revenue: number;
            /** Format: date-time */
            start: string;
        };
        /**
         * @description * `hour` - hour
         *     * `day` - day
         * @enum {string}
         */
        DashboardBucketEnum: "hour" | "day";
        /** @description Order-state counters as the orders stand now (not windowed by ``range``). */
        DashboardFulfilment: {
            /** @description Delivered today (Asia/Tashkent), pickup included. */
            completed_today: number;
            /** @description Handed to the courier and not coming back. */
            in_delivery: number;
            /** @description Open delivery issues. */
            needs_action: number;
            /** @description Processing orders still to be prepared: Yandex `awaiting_dispatch` (or `failed` / `returned` waiting for a new dispatch), BTS not handed over, pickup. */
            paid_to_prepare: number;
            /** @description Yandex `returning` / `returned` while the order is open. */
            returning: number;
            /** @description Processing Yandex orders whose courier is requested, assigned or arrived. */
            to_hand_to_courier: number;
            /** @description Open urgent delivery issues. */
            urgent: number;
        };
        /**
         * @description * `today` - today
         *     * `week` - week
         *     * `month` - month
         *     * `custom` - custom
         * @enum {string}
         */
        DashboardRangeEnum: "today" | "week" | "month" | "custom";
        DashboardStats: {
            deleted_customers: number;
            new_customers: number;
            orders: number;
            out_of_stock: number;
            revenue: number;
            total_customers: number;
        };
        DayBlock: {
            end: string;
            kind: components["schemas"]["BlockKindEnum"];
            label: string | null;
            start: string;
        };
        /** @description ``GET appointments/?date=`` (contract §2.9). */
        DaySchedule: {
            appointments: components["schemas"]["AppointmentItem"][];
            /** Format: date */
            date: string;
            specialists: components["schemas"]["SpecialistDay"][];
        };
        /**
         * @description One row of the exception queue: ``details`` holds ids and amounts only; ``resolved_by`` is ``null``
         *     while open or when the system closed it.
         */
        DeliveryIssue: {
            code: string;
            details: unknown;
            id: number;
            kind: components["schemas"]["DeliveryIssueKindEnum"];
            note: string;
            /** Format: date-time */
            opened_at: string;
            order_id: number;
            /** Format: date-time */
            reminded_at: string | null;
            reminders: number;
            resolution_note: string;
            /** Format: date-time */
            resolved_at: string | null;
            resolved_by: components["schemas"]["Actor"] | null;
            state: components["schemas"]["DeliveryIssueStateEnum"];
            /** Format: date-time */
            updated_at: string;
            urgent: boolean;
        };
        /**
         * @description * `dispatch_failed` - dispatch_failed
         *     * `dispatch_unknown` - dispatch_unknown
         *     * `dispatch_review` - dispatch_review
         *     * `delivery_failed` - delivery_failed
         *     * `return_pending` - return_pending
         *     * `preparation_overdue` - preparation_overdue
         *     * `cancel_incomplete` - cancel_incomplete
         *     * `parcel_unaccounted` - parcel_unaccounted
         *     * `incident` - incident
         * @enum {string}
         */
        DeliveryIssueKindEnum: "dispatch_failed" | "dispatch_unknown" | "dispatch_review" | "delivery_failed" | "return_pending" | "preparation_overdue" | "cancel_incomplete" | "parcel_unaccounted" | "incident";
        /** @description One open issue on the order card (the queue has the full row: ``GET delivery/issues/``). */
        DeliveryIssueRef: {
            code: string;
            id: number;
            kind: components["schemas"]["DeliveryIssueKindEnum"];
            /** Format: date-time */
            opened_at: string;
            urgent: boolean;
        };
        /**
         * @description * `open` - open
         *     * `resolved` - resolved
         * @enum {string}
         */
        DeliveryIssueStateEnum: "open" | "resolved";
        /**
         * @description * `standard` - standard
         *     * `express` - express
         * @enum {string}
         */
        DeliveryMethodEnum: "standard" | "express";
        /**
         * @description * `bts` - bts
         *     * `yandex` - yandex
         * @enum {string}
         */
        DeliveryProviderEnum: "bts" | "yandex";
        /**
         * @description * `coordinates_required` - coordinates_required
         *     * `provider_unavailable` - provider_unavailable
         *     * `out_of_zone` - out_of_zone
         *     * `method_disabled` - method_disabled
         *     * `too_heavy` - too_heavy
         *     * `warehouse_closed` - warehouse_closed
         *     * `dispatch_suspended` - dispatch_suspended
         *     * `not_configured` - not_configured
         * @enum {string}
         */
        DeliveryUnavailableReasonEnum: "coordinates_required" | "provider_unavailable" | "out_of_zone" | "method_disabled" | "too_heavy" | "warehouse_closed" | "dispatch_suspended" | "not_configured";
        DeviceRequest: {
            fcm_token?: string | null;
            /** @default  */
            locale: string;
            /** @default  */
            model: string;
            /** @default  */
            os: string;
            push_enabled: boolean;
        };
        DeviceState: {
            app_version: string;
            fid: string;
            /** Format: date-time */
            last_active_at: string;
            model: string;
            os: string;
            platform: components["schemas"]["OrderChannelEnum"];
            push_enabled: boolean;
        };
        /** @description ``POST orders/{id}/dispatch/`` (Yandex Delivery plan §3.6): staff checked the parcel and weighed it. */
        DispatchRequest: {
            /** @description So'm (VAT-inclusive): the courier price staff approved; only while a `dispatch_review` issue is open. */
            approved_price?: number | null;
            /** @description Must be `true`: staff checked the contents. */
            contents_verified: boolean;
            /**
             * @description Switch the delivery method (the fee the customer paid never changes).
             *
             *     * `standard` - standard
             *     * `express` - express
             */
            method?: (components["schemas"]["DeliveryMethodEnum"] | components["schemas"]["NullEnum"]) | null;
            /** @description Grams. */
            weight_g: number;
        };
        ErrorEnvelope: {
            code: string;
            errors: components["schemas"]["ErrorItem"][];
            message: string;
            request_id: string;
        };
        ErrorItem: {
            code: string;
            field: string | null;
            message: string;
        };
        /**
         * @description * `system` - system
         *     * `bts` - bts
         *     * `admin` - admin
         *     * `yandex` - yandex
         * @enum {string}
         */
        EventSourceEnum: "system" | "bts" | "admin" | "yandex";
        FreeSlots: {
            /** Format: date */
            date: string;
            duration_min: number;
            location_id: number;
            price: number;
            service_id: number;
            slot_step_min: number;
            slots: components["schemas"]["Slot"][];
            specialist_id: number;
            working_hours: components["schemas"]["SlotWorkingHours"] | null;
        };
        /**
         * @description * `delivery` - delivery
         *     * `pickup` - pickup
         * @enum {string}
         */
        FulfilmentMethodEnum: "delivery" | "pickup";
        Health: {
            /** @description With `integrations`: no cashback policy version is in force, so purchases earn nothing. Informational, never fails readiness; `null` while the database check fails. */
            cashback_policy_missing?: boolean | null;
            checks?: {
                [key: string]: "ok" | "error";
            };
            /** @description `?ready=1` only, and only for a caller that passes the admin network gate (§1): the mode of every provider with a `*_MODE` setting. */
            integrations?: components["schemas"]["ProviderModes"];
            /** @description `?ready=1` only, and only for a caller that passes the admin network gate (§1): one entry per provider whose mode is `live`. A live provider that is not configured makes `status` `error` (503) for every caller. */
            providers?: {
                [key: string]: components["schemas"]["ProviderReadiness"];
            };
            /** @description With `integrations`: the live providers configured against a sandbox (BTS test host, Payme sandbox checkout / `PAYME_TEST_MODE`); empty in a real deployment. */
            sandbox?: string[];
            status: components["schemas"]["HealthStatusEnum"];
            version?: string;
        };
        /**
         * @description * `ok` - ok
         *     * `error` - error
         * @enum {string}
         */
        HealthStatusEnum: "ok" | "error";
        /** @description One date's own hours; ``day_off`` = no hours that day (``start`` / ``end`` null). */
        HoursOverride: {
            /** Format: date-time */
            created_at: string;
            created_by: components["schemas"]["Actor"] | null;
            /** Format: date */
            date: string;
            readonly day_off: boolean;
            /** Format: time */
            end: string | null;
            id: number;
            location_id: number | null;
            note: string;
            /** Format: time */
            start: string | null;
        };
        /**
         * @description Body of ``POST specialists/{id}/overrides/``: ``start`` and ``end`` both set (that date's hours) or
         *     both null / omitted (a day off).
         */
        HoursOverrideCreateRequest: {
            /**
             * Format: date
             * @description Tashkent calendar day, today … today + 365.
             */
            date: string;
            /**
             * Format: time
             * @description "HH:MM", Tashkent, minutes a multiple of 5.
             */
            end?: string | null;
            /** @description Required when working; null on a day off. */
            location_id?: number | null;
            note?: string;
            /**
             * Format: time
             * @description "HH:MM", Tashkent, minutes a multiple of 5.
             */
            start?: string | null;
        };
        /** @description Contract 1.4: i18n text is {"uz", "ru", "en"}; "" means not filled, never null. */
        I18nText40: {
            en: string;
            ru: string;
            uz: string;
        };
        /** @description Contract 1.4: i18n text is {"uz", "ru", "en"}; "" means not filled, never null. */
        I18nText60: {
            en: string;
            ru: string;
            uz: string;
        };
        /** @description Contract 1.4: i18n text is {"uz", "ru", "en"}; "" means not filled, never null. */
        I18nText80: {
            en: string;
            ru: string;
            uz: string;
        };
        /** @description Contract 1.4: i18n text is {"uz", "ru", "en"}; "" means not filled, never null. */
        I18nText120: {
            en: string;
            ru: string;
            uz: string;
        };
        /** @description Contract 1.4: i18n text is {"uz", "ru", "en"}; "" means not filled, never null. */
        I18nText300: {
            en: string;
            ru: string;
            uz: string;
        };
        /** @description Contract 1.4: i18n text is {"uz", "ru", "en"}; "" means not filled, never null. */
        I18nText500: {
            en: string;
            ru: string;
            uz: string;
        };
        /** @description Contract 1.4: i18n text is {"uz", "ru", "en"}; "" means not filled, never null. */
        I18nText2000: {
            en: string;
            ru: string;
            uz: string;
        };
        /** @description Body of ``PUT banners/order/``. */
        IdOrderRequest: {
            ids: number[];
        };
        /**
         * @description ``alt`` of a product image, ``{uz, ru, en}`` ≤160 each; ``""`` = the website uses the product name.
         *     On write every leaf is optional (merged leaf by leaf).
         */
        ImageAlt: {
            en?: string;
            ru?: string;
            uz?: string;
        };
        /**
         * @description ``alt`` of a product image, ``{uz, ru, en}`` ≤160 each; ``""`` = the website uses the product name.
         *     On write every leaf is optional (merged leaf by leaf).
         */
        ImageAltRequest: {
            en?: string;
            ru?: string;
            uz?: string;
        };
        /** @description Body of ``PUT products/{id}/images/order/``. */
        ImageOrderRequest: {
            image_ids: number[];
        };
        ImagesResponse: {
            images: components["schemas"]["ProductImage"][];
        };
        ImageUrl: {
            /**
             * Format: uri
             * @description 1000 px WebP variant.
             */
            image_medium_url: string;
            /**
             * Format: uri
             * @description 400 px WebP variant.
             */
            image_thumbnail_url: string;
            /** Format: uri */
            image_url: string;
        };
        /** @description C§2.12 ``InboxItem``: texts as rendered at creation (never re-rendered after a language switch). */
        InboxItem: {
            body: string;
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            delivered_at: string | null;
            id: number;
            /** @description 1000 px WebP variant. */
            readonly image_medium_url: string | null;
            /** @description 400 px WebP variant. */
            readonly image_thumbnail_url: string | null;
            readonly image_url: string | null;
            kind: components["schemas"]["InboxKindEnum"];
            readonly link: components["schemas"]["InboxLink"];
            /** Format: date-time */
            read_at: string | null;
            title: string;
        };
        /**
         * @description * `promo` - promo
         *     * `general` - general
         *     * `order_status` - order_status
         *     * `appointment` - appointment
         * @enum {string}
         */
        InboxKindEnum: "promo" | "general" | "order_status" | "appointment";
        InboxLink: {
            appointment_id: number | null;
            kind: components["schemas"]["InboxLinkKindEnum"];
            order_id: number | null;
            product_id: number | null;
            /** @description Kind `url`: the campaign's https link the app opens (gap ADM-10.1). */
            url: string | null;
        };
        /**
         * @description * `none` - none
         *     * `product` - product
         *     * `order` - order
         *     * `appointment` - appointment
         *     * `url` - url
         * @enum {string}
         */
        InboxLinkKindEnum: "none" | "product" | "order" | "appointment" | "url";
        /**
         * @description * `fake` - fake
         *     * `live` - live
         * @enum {string}
         */
        IntegrationModeEnum: "fake" | "live";
        /** @description Contract §2.14 ``Job``. */
        Job: {
            /** Format: date-time */
            created_at: string;
            created_by: components["schemas"]["Actor"] | null;
            error: unknown;
            /** Format: date-time */
            finished_at: string | null;
            id: number;
            kind: components["schemas"]["JobKindEnum"];
            params: unknown;
            progress: unknown;
            result: unknown;
            /** Format: date-time */
            started_at: string | null;
            state: components["schemas"]["JobStateEnum"];
        };
        /**
         * @description * `billz_import` - billz_import
         * @enum {string}
         */
        JobKindEnum: "billz_import";
        /**
         * @description * `queued` - queued
         *     * `running` - running
         *     * `succeeded` - succeeded
         *     * `failed` - failed
         * @enum {string}
         */
        JobStateEnum: "queued" | "running" | "succeeded" | "failed";
        LastChange: {
            actor: components["schemas"]["Actor"] | null;
            /** Format: date-time */
            at: string;
            kind: components["schemas"]["ProductChangeKindEnum"];
            new_price: number | null;
            old_price: number | null;
        };
        /** @description Contract §2.6 ``LedgerEntry``. */
        LedgerEntry: {
            readonly actor: components["schemas"]["Actor"] | null;
            amount: number;
            /** Format: date-time */
            at: string;
            balance_after: number;
            base: number | null;
            id: number;
            kind: components["schemas"]["LedgerKindEnum"];
            order_id: number | null;
            /** Format: decimal */
            percent: string | null;
            policy_version: number | null;
            promo_excluded: boolean;
            reason: string | null;
            reverses_id: number | null;
            readonly source_ref: string | null;
            source_type: components["schemas"]["LedgerSourceTypeEnum"];
        };
        LedgerItem: {
            amount: number;
            /** Format: date-time */
            at: string;
            balance_after: number;
            id: number;
            kind: components["schemas"]["LedgerKindEnum"];
            order_id: number | null;
            source: components["schemas"]["LedgerSourceEnum"];
            subtitle: string | null;
            title: string;
        };
        /**
         * @description * `credit` - credit
         *     * `debit` - debit
         *     * `adjustment` - adjustment
         *     * `reversal` - reversal
         * @enum {string}
         */
        LedgerKindEnum: "credit" | "debit" | "adjustment" | "reversal";
        /**
         * @description * `online` - online
         *     * `store` - store
         *     * `admin` - admin
         * @enum {string}
         */
        LedgerSourceEnum: "online" | "store" | "admin";
        /**
         * @description * `order` - order
         *     * `billz_sale` - billz_sale
         *     * `admin` - admin
         * @enum {string}
         */
        LedgerSourceTypeEnum: "order" | "billz_sale" | "admin";
        /**
         * @description * `none` - none
         *     * `product` - product
         *     * `url` - url
         * @enum {string}
         */
        LinkKindEnum: "none" | "product" | "url";
        LinkOption: {
            label: string;
            product_id: number;
        };
        Location: {
            readonly address: string;
            readonly directions: string;
            id: number;
            /** Format: double */
            readonly latitude: number | null;
            /** Format: double */
            readonly longitude: number | null;
            readonly name: string;
            readonly phone: string | null;
        };
        /** @description Translated street address. */
        LocationAddressRequest: {
            en?: string;
            ru?: string;
            uz?: string;
        };
        /** @description Translated street address. */
        LocationCreateAddressRequest: {
            en?: string;
            ru?: string;
            uz: string;
        };
        /** @description Translated clinic display name. */
        LocationCreateNameRequest: {
            en?: string;
            ru?: string;
            uz: string;
        };
        LocationDirectionsRequest: {
            en?: string;
            ru?: string;
            uz?: string;
        };
        /** @description Translated clinic display name. */
        LocationNameRequest: {
            en?: string;
            ru?: string;
            uz?: string;
        };
        LoginRequest: {
            /** Format: email */
            email: string;
            password: string;
        };
        LoginResponse: {
            access: string;
            /** Format: date-time */
            access_expires_at: string;
            refresh: string;
            /** Format: date-time */
            refresh_expires_at: string;
            user: components["schemas"]["Me"];
        };
        LogoutRequest: {
            refresh: string;
            /** @default current */
            scope: components["schemas"]["LogoutScopeEnum"];
        };
        /**
         * @description * `current` - current
         *     * `others` - others
         *     * `all` - all
         * @enum {string}
         */
        LogoutScopeEnum: "current" | "others" | "all";
        /**
         * @description * `payme` - payme
         *     * `no_paydoc` - no_paydoc
         *     * `fake_mode` - fake_mode
         *     * `uzum_fake` - uzum_fake
         * @enum {string}
         */
        ManualReasonEnum: "payme" | "no_paydoc" | "fake_mode" | "uzum_fake";
        Me: {
            /**
             * @description How the current session's sign-in was proven: `password` (email + password) or the social provider (`google`, `facebook`); `null` for a session opened before the method was recorded. Only a `password` session may link a social identity (`auth/oauth/{provider}/link/`).
             *
             *     * `password` - password
             *     * `google` - google
             *     * `facebook` - facebook
             *     * `apple` - apple
             */
            auth_method: (components["schemas"]["AuthMethodEnum"] | components["schemas"]["NullEnum"]) | null;
            capabilities: components["schemas"]["Capabilities"];
            display_name: string;
            /** Format: email */
            email: string;
            id: number;
            /** @description May manage staff (`staff/` writes, §2.16); the UI shows the staff screen only then. */
            is_manager: boolean;
            is_superuser: boolean;
            /**
             * @description The admin panel's language (`PATCH auth/me/`).
             *
             *     * `uz` - uz
             *     * `ru` - ru
             *     * `en` - en
             */
            language: components["schemas"]["ContentLanguageEnum"];
            linked_providers: components["schemas"]["SocialProviderEnum"][];
            /** @description The account has a confirmed admin panel TOTP device. */
            mfa_enabled: boolean;
            /** @description The account must set its own password first: every admin route but `auth/me/`, `auth/change-password/`, `auth/password-link/` and `auth/logout/` answers 403 `password_change_required` until it does. */
            must_change_password: boolean;
            role: components["schemas"]["StaffRoleEnum"];
            /** Format: date-time */
            session_expires_at: string;
        };
        /** @description ``POST me/email/code/``. */
        MeEmailCodeRequest: {
            email: string;
        };
        /**
         * @description ``POST me/email/``: the address, its e-mail code and, unless the session is fresh, the
         *     re-authentication.
         */
        MeEmailRequest: {
            code: string;
            email: string;
            password?: string | null;
            verification_token?: string | null;
        };
        MePasswordRequest: {
            current_password?: string | null;
            password: string;
            verification_token?: string | null;
        };
        /** @description ``POST me/phone/code/``. */
        MePhoneCodeRequest: {
            phone: string;
        };
        /** @description ``POST me/phone/``: the phone, its SMS code and, unless the session is fresh, the re-authentication. */
        MePhoneRequest: {
            code: string;
            password?: string | null;
            phone: string;
            verification_token?: string | null;
        };
        MeSocialLinkRequest: {
            authorization_code?: string | null;
            nonce?: string | null;
            password?: string | null;
            provider: components["schemas"]["CustomerSocialProviderEnum"];
            token: string;
            token_type?: (components["schemas"]["SocialTokenTypeEnum"] | components["schemas"]["NullEnum"]) | null;
            verification_token?: string | null;
        };
        MetaSegment: {
            id: number;
            name: string;
            size: number;
        };
        /**
         * @description The 200 of ``auth/login/`` and ``auth/oauth/{provider}/`` for an account with the panel MFA on: no
         *     session yet, answer the challenge at ``auth/mfa/verify/``.
         */
        MfaChallenge: {
            /** @description Opaque, single use; send it to `auth/mfa/verify/`. */
            challenge: string;
            /**
             * Format: date-time
             * @description 5 minutes after the first step.
             */
            challenge_expires_at: string;
            /** @description Always `true` (tells this answer from a session). */
            mfa_required: boolean;
        };
        /** @description ``POST auth/mfa/confirm/`` body. */
        MfaConfirmRequest: {
            /** @description The 6-digit code the authenticator shows now. */
            code: string;
            device_id: number;
        };
        /** @description ``POST auth/mfa/disable/`` body. */
        MfaDisableRequest: {
            /** @description The authenticator's 6-digit code or one unused recovery code. */
            code_or_recovery: string;
            current_password: string;
        };
        /** @description ``POST auth/mfa/setup/`` body. */
        MfaPasswordRequest: {
            current_password: string;
        };
        /** @description ``auth/mfa/confirm/`` and ``auth/mfa/recovery-codes/`` (200): shown once, never again. */
        MfaRecoveryCodes: {
            /** @description Ten `xxxxx-xxxxx` codes. */
            recovery_codes: string[];
        };
        /** @description ``POST auth/mfa/recovery-codes/`` body. */
        MfaRegenerateRequest: {
            /** @description The 6-digit code the authenticator shows now. */
            code: string;
            current_password: string;
        };
        /** @description ``POST auth/mfa/setup/`` (200): the pending device to scan (QR of ``otpauth_uri``) or type. */
        MfaSetup: {
            device_id: number;
            /** @description The secret in base32, in groups of four. */
            manual_key: string;
            /** @description `otpauth://totp/…`, issuer "Glow Derma Admin". */
            otpauth_uri: string;
        };
        MfaStatus: {
            /** @description A confirmed admin panel TOTP device (= `me.mfa_enabled`). */
            enabled: boolean;
            /** @description Unused recovery codes (0 while off). */
            recovery_codes_left: number;
        };
        /** @description ``POST auth/mfa/verify/`` body: the challenge and exactly one of ``code`` / ``recovery_code``. */
        MfaVerifyRequest: {
            challenge: string;
            /** @description The authenticator's 6-digit code. */
            code?: string;
            /** @description One unused recovery code instead of `code` (`xxxxx-xxxxx`; case and dashes are ignored). */
            recovery_code?: string;
        };
        NavCounts: {
            appointments_pending: number;
            /** @description Open delivery issues (the exception queue). */
            delivery_issues_open: number;
            orders_processing: number;
        };
        NextStep: {
            email_mask: string | null;
            expires_in: number;
            next_step: components["schemas"]["NextStepEnum"];
            otp: components["schemas"]["OtpInfo"] | null;
            phone_mask: string | null;
            provider: (components["schemas"]["CustomerSocialProviderEnum"] | components["schemas"]["NullEnum"]) | null;
            social_ticket: string | null;
        };
        /**
         * @description * `verify_device` - verify_device
         *     * `verify_phone` - verify_phone
         * @enum {string}
         */
        NextStepEnum: "verify_device" | "verify_phone";
        /** @description The next band: its percent, start, the so'm left and the 0..1 progress. */
        NextTier: {
            from: number;
            /** Format: decimal */
            percent: string;
            /** Format: double */
            progress: number;
            remaining: number;
        };
        Nonce: {
            expires_in: number;
            nonce: string;
        };
        NotificationAudience: {
            phone: string | null;
            segment_id: number | null;
            segment_name: string | null;
            type: components["schemas"]["AudienceTypeEnum"];
        };
        NotificationFormRequest: {
            "audience.phone"?: string;
            "audience.segment_id"?: number;
            "audience.type": components["schemas"]["AudienceTypeEnum"];
            body: string;
            /** Format: binary */
            image?: string;
            kind: components["schemas"]["NotificationKindEnum"];
            "link.kind"?: components["schemas"]["LinkKindEnum"];
            "link.product_id"?: number;
            "link.url"?: string;
            /** Format: date-time */
            scheduled_at?: string;
            title: string;
        };
        /**
         * @description * `promo` - promo
         *     * `general` - general
         * @enum {string}
         */
        NotificationKindEnum: "promo" | "general";
        NotificationLink: {
            kind: components["schemas"]["LinkKindEnum"];
            label: string | null;
            product_id: number | null;
            /** @description Kind `url` (gap ADM-10.1): the https link. */
            url: string | null;
        };
        NotificationMeta: {
            /** @description CAMPAIGN_APPROVAL_DELAY_MINUTES: the cancel window between an approval and the dispatch. */
            approval_delay_minutes: number;
            link_options: components["schemas"]["LinkOption"][];
            segments: components["schemas"]["MetaSegment"][];
            templates: components["schemas"]["StatusTemplate"][];
            total_devices: number;
        };
        NotificationRecord: {
            /** Format: date-time */
            approved_at: string | null;
            approved_by: components["schemas"]["Actor"] | null;
            approved_revision: number | null;
            readonly attempted: number | null;
            readonly audience: components["schemas"]["NotificationAudience"];
            author: components["schemas"]["Actor"] | null;
            body: string;
            /**
             * Format: date-time
             * @description When a superuser cancelled the approved campaign, or a stop sent nothing.
             */
            cancelled_at: string | null;
            cancelled_by: components["schemas"]["Actor"] | null;
            /** Format: date-time */
            created_at: string;
            delivered: number | null;
            /**
             * Format: date-time
             * @description State `scheduled`: the beat starts the send after this instant.
             */
            dispatch_after: string | null;
            /** @description FCM rejected / no token; a live tally while sending. */
            failed: number | null;
            /** Format: date-time */
            failed_at: string | null;
            id: number;
            /** @description 1000 px WebP variant. */
            readonly image_medium_url: string | null;
            /** @description 400 px WebP variant. */
            readonly image_thumbnail_url: string | null;
            readonly image_url: string | null;
            kind: components["schemas"]["NotificationKindEnum"];
            last_error: string;
            readonly link: components["schemas"]["NotificationLink"];
            recipient_count: number;
            /** @description Bumps on every content change; tests and approvals name it. */
            revision: number;
            /**
             * Format: date-time
             * @description The author's requested send time; the dispatch waits for it.
             */
            scheduled_at: string | null;
            /** @description FCM accepted; a live tally while sending. */
            sent: number | null;
            /** Format: date-time */
            sent_at: string | null;
            /** Format: date-time */
            started_at: string | null;
            state: components["schemas"]["NotificationStateEnum"];
            /** Format: date-time */
            stop_requested_at: string | null;
            stop_requested_by: components["schemas"]["Actor"] | null;
            /** Format: date-time */
            stopped_at: string | null;
            /** Format: date-time */
            test_confirmed_at: string | null;
            test_confirmed_by: components["schemas"]["Actor"] | null;
            tested_revision: number | null;
            tests: components["schemas"]["CampaignTest"][];
            title: string;
            /** Format: date-time */
            updated_at: string;
        };
        /**
         * @description * `draft` - draft
         *     * `tested` - tested
         *     * `scheduled` - scheduled
         *     * `sending` - sending
         *     * `stopping` - stopping
         *     * `sent` - sent
         *     * `partially_sent` - partially_sent
         *     * `cancelled` - cancelled
         *     * `failed` - failed
         * @enum {string}
         */
        NotificationStateEnum: "draft" | "tested" | "scheduled" | "sending" | "stopping" | "sent" | "partially_sent" | "cancelled" | "failed";
        /** @enum {unknown} */
        NullEnum: null;
        /**
         * @description Body of ``POST auth/oauth/{provider}/`` and ``.../link/`` (contract 2.1).
         *
         *     ``context["provider"]`` decides whether ``nonce`` is required (Google only). ``redirect_uri`` must equal
         *     the provider's configured callback (``GOOGLE_OAUTH_REDIRECT_URI`` / ``FACEBOOK_OAUTH_REDIRECT_URI``, which
         *     fall back to the deprecated ``OAUTH_REDIRECT_URI``) when that is set.
         */
        OAuthCallbackRequest: {
            code: string;
            code_verifier: string;
            nonce?: string;
            /** Format: uri */
            redirect_uri: string;
        };
        OnlineOrders: {
            /** @description Every order of any status: what `orders/?customer={id}` lists (the card's orders link). */
            all_count: number;
            /** @description Paid, non-reversed online purchases. */
            count: number;
            /** Format: date-time */
            last_order_at: string | null;
            /** @description The newest order of any status. */
            last_order_id: number | null;
        };
        /**
         * @description ``POST orders/{id}/issues/``: staff open an ``incident`` (a wrong or missing product…); every other
         *     kind is opened by the system only.
         */
        OpenIssueRequest: {
            /** @description `incident` (the only kind staff may open) */
            kind: string;
            note: string;
            /** @default false */
            urgent: boolean;
        };
        OrderCashback: {
            amount: number;
            /** Format: date-time */
            at: string;
            base: number | null;
            kind: components["schemas"]["OrderCashbackKindEnum"];
            ledger_entry_id: number;
            /** Format: decimal */
            percent: string | null;
            reverses_id: number | null;
        };
        /**
         * @description * `debit` - debit
         *     * `credit` - credit
         *     * `reversal` - reversal
         * @enum {string}
         */
        OrderCashbackKindEnum: "debit" | "credit" | "reversal";
        /**
         * @description * `ios` - ios
         *     * `android` - android
         *     * `web` - web
         * @enum {string}
         */
        OrderChannelEnum: "ios" | "android" | "web";
        /**
         * @description The order's carrier view (``null`` for pickup). BTS: ``provider`` and ``open_issues`` only, every
         *     Yandex key ``null``. Amounts in so'm; ``claim_status`` is Yandex's status verbatim; no courier phone.
         */
        OrderDelivery: {
            approved_price: number | null;
            /** @description Yandex's final prices of every claim of the shipment, summed. */
            carrier_cost_total: number | null;
            /** @description Yandex's estimate the checkout quote was computed from. */
            carrier_price: number | null;
            claim_number: number | null;
            claim_status: string | null;
            cost_difference: number | null;
            courier_name: string | null;
            courier_vehicle: string | null;
            failure_code: string | null;
            method: (components["schemas"]["DeliveryMethodEnum"] | components["schemas"]["NullEnum"]) | null;
            /** @description The binding offer of the current courier claim (VAT included). */
            offer_price: number | null;
            open_issues: components["schemas"]["DeliveryIssueRef"][];
            parcel_weight_g: number | null;
            /** Format: date-time */
            prepared_at: string | null;
            /** Format: date-time */
            promised_from: string | null;
            /** Format: date-time */
            promised_to: string | null;
            provider: components["schemas"]["DeliveryProviderEnum"];
            /** @description The fee the checkout quote charged. */
            quote_fee: number | null;
            stage: (components["schemas"]["ShipmentStageEnum"] | components["schemas"]["NullEnum"]) | null;
            tracking_url: string | null;
        };
        /** @description Contract ``Order`` = ``OrderSummary`` + the detail keys (rendered from ``selectors.order_detail``). */
        OrderDetail: {
            readonly address: string | null;
            available_actions: components["schemas"]["AvailableActions"];
            readonly cancellation: components["schemas"]["Cancellation"] | null;
            cashback: components["schemas"]["OrderCashback"][];
            cashback_hold: components["schemas"]["CashbackHold"] | null;
            cashback_used: number;
            channel: components["schemas"]["OrderChannelEnum"];
            /** Format: date-time */
            created_at: string;
            customer: components["schemas"]["CustomerRef"];
            readonly delivery: components["schemas"]["OrderDelivery"] | null;
            delivery_fee: number;
            fulfilment: components["schemas"]["FulfilmentMethodEnum"];
            history: components["schemas"]["OrderEvent"][];
            id: number;
            items: components["schemas"]["OrderItem"][];
            items_subtotal: number;
            payment: components["schemas"]["OrderPayment"];
            promo_subtotal: number;
            refunds: components["schemas"]["Refund"][];
            readonly shipment: Omit<components["schemas"]["Shipment"], "state">;
            status: components["schemas"]["OrderStatusEnum"];
            total: number;
        };
        /** @description Contract §4 ``OrderEvent``: ``status_after`` ``""`` → ``null``; ``actor`` for source ``admin``. */
        OrderEvent: {
            actor: components["schemas"]["Actor"] | null;
            /** Format: date-time */
            at: string;
            data: unknown;
            id: number;
            source: components["schemas"]["EventSourceEnum"];
            readonly status_after: (components["schemas"]["OrderStatusEnum"] | components["schemas"]["NullEnum"]) | null;
            type: components["schemas"]["OrderEventTypeEnum"];
        };
        /**
         * @description * `order_created` - order_created
         *     * `reservation_created` - reservation_created
         *     * `payment_confirmed` - payment_confirmed
         *     * `billz_sale_recorded` - billz_sale_recorded
         *     * `cashback_credited` - cashback_credited
         *     * `payment_failed` - payment_failed
         *     * `shipment_created` - shipment_created
         *     * `shipment_failed` - shipment_failed
         *     * `status_changed` - status_changed
         *     * `handed_to_courier` - handed_to_courier
         *     * `delivered` - delivered
         *     * `cancelled` - cancelled
         *     * `reservation_expired` - reservation_expired
         *     * `refund_requested` - refund_requested
         *     * `refund_succeeded` - refund_succeeded
         *     * `refund_failed` - refund_failed
         *     * `delivery_failed` - delivery_failed
         *     * `shipment_returned` - shipment_returned
         * @enum {string}
         */
        OrderEventTypeEnum: "order_created" | "reservation_created" | "payment_confirmed" | "billz_sale_recorded" | "cashback_credited" | "payment_failed" | "shipment_created" | "shipment_failed" | "status_changed" | "handed_to_courier" | "delivered" | "cancelled" | "reservation_expired" | "refund_requested" | "refund_succeeded" | "refund_failed" | "delivery_failed" | "shipment_returned";
        OrderItem: {
            billz_id: string;
            /** @description 1000 px WebP variant. */
            image_medium_url: string | null;
            /** @description 400 px WebP variant. */
            image_thumbnail_url: string | null;
            image_url: string | null;
            name: string;
            product_id: number;
            promo: boolean;
            quantity: number;
            unit_price: number;
        };
        OrderPayment: {
            amount: number;
            /** Format: date-time */
            confirmed_at: string | null;
            provider: components["schemas"]["PaymentProviderEnum"];
            status: components["schemas"]["PaymentStatusEnum"];
            transaction_id: string | null;
        };
        /**
         * @description * `awaiting_payment` - awaiting_payment
         *     * `processing` - processing
         *     * `handed_to_courier` - handed_to_courier
         *     * `delivered` - delivered
         *     * `cancelled` - cancelled
         * @enum {string}
         */
        OrderStatusEnum: "awaiting_payment" | "processing" | "handed_to_courier" | "delivered" | "cancelled";
        /** @description Contract ``OrderSummary`` (list rows and the head of the detail). */
        OrderSummary: {
            readonly cancellation: components["schemas"]["Cancellation"] | null;
            /** Format: date-time */
            created_at: string;
            customer: components["schemas"]["CustomerRef"];
            readonly delivery: components["schemas"]["OrderDelivery"] | null;
            fulfilment: components["schemas"]["FulfilmentMethodEnum"];
            id: number;
            readonly payment: components["schemas"]["PaymentSummary"];
            readonly shipment: Omit<components["schemas"]["Shipment"], "state">;
            status: components["schemas"]["OrderStatusEnum"];
            total: number;
        };
        OtpInfo: {
            expires_in: number;
            length: number;
            resend_in: number;
        };
        /**
         * @description * `register` - register
         *     * `login_new_device` - login_new_device
         *     * `reset_password` - reset_password
         *     * `link_social` - link_social
         *     * `verify_email` - verify_email
         *     * `attach_phone` - attach_phone
         * @enum {string}
         */
        OtpPurposeEnum: "register" | "login_new_device" | "reset_password" | "link_social" | "verify_email" | "attach_phone";
        /** @description ``POST auth/password-link/`` (200): where the link went (masked) and until when it is valid. */
        OwnPasswordLink: {
            activation: components["schemas"]["Activation"];
            email_masked: string;
        };
        OwnPhotoUploadRequest: {
            /** Format: binary */
            file: string;
        };
        PaginatedAdminCustomerSessionList: {
            count: number;
            page: number;
            page_count: number;
            page_size: number;
            results: components["schemas"]["AdminCustomerSession"][];
        };
        PaginatedAuditEntryList: {
            count: number;
            page: number;
            page_count: number;
            page_size: number;
            results: components["schemas"]["AuditEntry"][];
        };
        PaginatedBannerList: {
            count: number;
            page: number;
            page_count: number;
            page_size: number;
            results: components["schemas"]["Banner"][];
        };
        PaginatedBlockedPeriodList: {
            count: number;
            page: number;
            page_count: number;
            page_size: number;
            results: components["schemas"]["BlockedPeriod"][];
        };
        PaginatedCategoryList: {
            count: number;
            page: number;
            page_count: number;
            page_size: number;
            results: components["schemas"]["Category"][];
        };
        PaginatedClinicSpecialistList: {
            count: number;
            page: number;
            page_count: number;
            page_size: number;
            results: components["schemas"]["ClinicSpecialist"][];
        };
        PaginatedCustomerAppointmentList: {
            count: number;
            page: number;
            page_count: number;
            page_size: number;
            results: components["schemas"]["CustomerAppointment"][];
        };
        PaginatedCustomerListItemList: {
            count: number;
            page: number;
            page_count: number;
            page_size: number;
            results: components["schemas"]["CustomerListItem"][];
        };
        PaginatedCustomerOrderSummaryList: {
            count: number;
            page: number;
            page_count: number;
            page_size: number;
            results: components["schemas"]["CustomerOrderSummary"][];
        };
        PaginatedCustomerSessionList: {
            count: number;
            page: number;
            page_count: number;
            page_size: number;
            results: components["schemas"]["CustomerSession"][];
        };
        PaginatedDeliveryIssueList: {
            count: number;
            page: number;
            page_count: number;
            page_size: number;
            results: components["schemas"]["DeliveryIssue"][];
        };
        PaginatedHoursOverrideList: {
            count: number;
            page: number;
            page_count: number;
            page_size: number;
            results: components["schemas"]["HoursOverride"][];
        };
        PaginatedInboxItemList: {
            count: number;
            page: number;
            page_count: number;
            page_size: number;
            results: components["schemas"]["InboxItem"][];
            unread_count: number;
        };
        PaginatedLedgerItemList: {
            count: number;
            page: number;
            page_count: number;
            page_size: number;
            results: components["schemas"]["LedgerItem"][];
        };
        PaginatedNotificationRecordList: {
            count: number;
            page: number;
            page_count: number;
            page_size: number;
            results: components["schemas"]["NotificationRecord"][];
        };
        PaginatedOrderSummaryList: {
            count: number;
            page: number;
            page_count: number;
            page_size: number;
            results: components["schemas"]["OrderSummary"][];
        };
        PaginatedPaymentList: {
            count: number;
            page: number;
            page_count: number;
            page_size: number;
            results: components["schemas"]["Payment"][];
        };
        PaginatedProductCardList: {
            count: number;
            page: number;
            page_count: number;
            page_size: number;
            results: components["schemas"]["ProductCard"][];
        };
        PaginatedProductList: {
            count: number;
            page: number;
            page_count: number;
            page_size: number;
            results: components["schemas"]["Product"][];
        };
        PaginatedSegmentList: {
            count: number;
            page: number;
            page_count: number;
            page_size: number;
            results: components["schemas"]["Segment"][];
        };
        PaginatedStaffListItemList: {
            count: number;
            page: number;
            page_count: number;
            page_size: number;
            results: components["schemas"]["StaffListItem"][];
        };
        /** @description ``POST auth/password-token/check/`` (200): whose link it is, for the set-password page. */
        PasswordTokenInfo: {
            /** @description The account's e-mail, masked (`a***@glowderma.uz`). */
            email_masked: string;
            /** Format: date-time */
            expires_at: string;
            full_name: string;
            purpose: components["schemas"]["StaffPasswordPurposeEnum"];
        };
        /** @description ``POST auth/password-token/check/`` body. */
        PasswordTokenRequest: {
            token: string;
        };
        /** @description ``POST auth/password-token/set/`` body (the password is validated for the link's account). */
        PasswordTokenSetRequest: {
            new_password: string;
            token: string;
        };
        /**
         * @description ``POST`` (``text`` required) and ``PATCH`` (``partial``) of ``me/addresses/`` (customer contract
         *     §2.2.7).
         */
        PatchedAddressWriteRequest: {
            city_code?: string;
            comment?: string;
            is_default?: boolean;
            label?: string;
            /** Format: double */
            latitude?: number | null;
            /** Format: double */
            longitude?: number | null;
            region_code?: string;
            text?: string;
        };
        PatchedBannerPatchFormRequest: {
            /** Format: date-time */
            ends_at?: string | null;
            /** Format: binary */
            image?: string;
            is_active?: boolean;
            "link.category"?: string | null;
            "link.kind"?: components["schemas"]["BannerLinkKindEnum"];
            "link.product_id"?: number | null;
            "link.url"?: string | null;
            /** Format: date-time */
            starts_at?: string | null;
            "title.en"?: string;
            "title.ru"?: string;
            "title.uz"?: string;
        };
        /**
         * @description ``PATCH banners/{id}/`` (JSON or multipart): ``title`` merged leaf by leaf, every field optional.
         *
         *     An unchanged ``link.product_id`` is not re-checked against the active products, so a banner whose product
         *     was hidden later can still be edited or switched off (contract §2.5).
         */
        PatchedBannerPatchRequest: {
            /** Format: date-time */
            ends_at?: string | null;
            /** @default true */
            is_active: boolean;
            link?: components["schemas"]["BannerLinkRequest"];
            /** Format: date-time */
            starts_at?: string | null;
            title?: components["schemas"]["BannerTitlePatchRequest"];
        };
        PatchedCategoryPatchFormRequest: {
            /** Format: binary */
            image?: string;
            is_active?: boolean;
            "name.en"?: string;
            "name.ru"?: string;
            "name.uz"?: string;
            remove_image?: boolean;
            "seo.en.description"?: string;
            "seo.en.title"?: string;
            "seo.ru.description"?: string;
            "seo.ru.title"?: string;
            "seo.uz.description"?: string;
            "seo.uz.title"?: string;
        };
        /**
         * @description ``PATCH categories/{slug}/``: every field optional; ``remove_image: true`` drops the stored image
         *     (gap ADM-5.1; refused together with a new ``image`` part: ``remove_image`` ``invalid``).
         */
        PatchedCategoryPatchRequest: {
            /** @default true */
            is_active: boolean;
            name?: components["schemas"]["CategoryNameRequest"];
            /** @default false */
            remove_image: boolean;
            seo?: components["schemas"]["SeoTextsRequest"];
            slug?: string;
        };
        /** @description Texts merge leaf by leaf. Coordinates must be set or cleared together. */
        PatchedClinicLocationPatchRequest: {
            address?: components["schemas"]["LocationAddressRequest"];
            directions?: components["schemas"]["LocationDirectionsRequest"];
            is_active?: boolean;
            /** Format: double */
            latitude?: number | null;
            /** Format: double */
            longitude?: number | null;
            name?: components["schemas"]["LocationNameRequest"];
            /** @description An Uzbek mobile number; separators and a missing +998 are accepted and the value is normalised to E.164 (+998XXXXXXXXX). */
            phone?: string | null;
        };
        /**
         * @description Body of ``POST …/services/`` and (``partial``) ``PATCH …/services/{id}/`` of one specialist (texts
         *     merge leaf by leaf). ``category`` defaults from the specialist's role on create.
         */
        PatchedClinicServiceWriteRequest: {
            /**
             * @description Defaults from the specialist's role on create.
             *
             *     * `dermatology` - dermatology
             *     * `cosmetology` - cosmetology
             */
            category?: components["schemas"]["ServiceCategoryEnum"];
            description?: components["schemas"]["ServiceDescriptionRequest"];
            /** @description Minutes, a multiple of 5 (5 … 480). */
            duration_min?: number;
            /** @default true */
            is_active: boolean;
            name?: components["schemas"]["ServiceNameRequest"];
            /** @description Order within the specialist's services; appended last on create. */
            position?: number;
            /** @description So'm, 0 … 100 000 000; snapshotted by every booking. */
            price?: number;
            short_name?: components["schemas"]["ServiceShortNameRequest"];
        };
        /**
         * @description ``PATCH specialists/{id}/`` (validated with ``partial=True``): every field optional; ``qualifications``
         *     and ``bio`` merge leaf by leaf; ``force`` confirms a deactivation despite upcoming appointments.
         */
        PatchedClinicSpecialistPatchRequest: {
            bio?: components["schemas"]["SpecialistTextRequest"];
            experience_years?: number | null;
            /**
             * @description With is_active=false: deactivate even with requested/confirmed appointments ahead.
             * @default false
             */
            force: boolean;
            /** @description Published: listed on the website and bookable. Publishing needs a complete profile. */
            is_active?: boolean;
            /** @description The primary clinic, which must be included in location_ids. */
            location_id?: number;
            location_ids?: number[];
            name?: string;
            position?: number;
            qualifications?: components["schemas"]["SpecialistTextRequest"];
            role?: components["schemas"]["SpecialistRoleEnum"];
            /** @description The customer slot grid in minutes: 10, 15, 20, 30 (default) or 60. */
            slot_step_min?: number;
            /** @description Optional on create (derived from the name). */
            slug?: string;
        };
        PatchedCustomerCartQuantityRequest: {
            quantity?: number;
        };
        /** @description Body of ``PATCH products/{id}/images/{image_id}/``: ``{alt: {uz?, ru?, en?}}``. */
        PatchedImagePatchRequest: {
            alt?: components["schemas"]["ImageAltRequest"];
        };
        PatchedMePatchRequest: {
            language?: components["schemas"]["ContentLanguageEnum"];
            name?: string;
            push_enabled?: boolean;
        };
        /** @description ``PATCH auth/me/`` body: ``language`` (uz, ru, en). */
        PatchedMeUpdateRequest: {
            language?: components["schemas"]["ContentLanguageEnum"];
        };
        PatchedNotificationPatchFormRequest: {
            "audience.phone"?: string;
            "audience.segment_id"?: number;
            "audience.type"?: components["schemas"]["AudienceTypeEnum"];
            body?: string;
            expected_revision?: number;
            /** Format: binary */
            image?: string;
            kind?: components["schemas"]["NotificationKindEnum"];
            "link.kind"?: components["schemas"]["LinkKindEnum"];
            "link.product_id"?: number;
            "link.url"?: string;
            remove_image?: boolean;
            /** Format: date-time */
            scheduled_at?: string | null;
            title?: string;
        };
        /**
         * @description ``PATCH specialist/profile/`` (validated ``partial``): the staff profile fields without the clinics
         *     and the site order, which stay with staff (sent anyway, they are ignored). Texts merge leaf by leaf;
         *     ``is_active`` publishes or unpublishes under the staff rules (``force`` confirms an unpublish despite
         *     upcoming visits).
         */
        PatchedOwnProfileRequest: {
            bio?: components["schemas"]["SpecialistTextRequest"];
            experience_years?: number | null;
            /**
             * @description With is_active=false: deactivate even with requested/confirmed appointments ahead.
             * @default false
             */
            force: boolean;
            /** @description Published: listed on the website and bookable. Publishing needs a complete profile. */
            is_active?: boolean;
            name?: string;
            qualifications?: components["schemas"]["SpecialistTextRequest"];
            role?: components["schemas"]["SpecialistRoleEnum"];
            /** @description The customer slot grid in minutes: 10, 15, 20, 30 (default) or 60. */
            slot_step_min?: number;
            /** @description Optional on create (derived from the name). */
            slug?: string;
        };
        /**
         * @description ``PATCH products/{id}/``: every field optional and ``texts`` merged leaf by leaf (contract §2.3).
         *
         *     Validation is the create serializer's (``partial=True`` skips absent fields); the separate class gives the
         *     OpenAPI request its true shape, where no ``texts`` leaf is required.
         */
        PatchedProductPatchRequest: {
            billz_id?: string;
            category?: string | null;
            price?: number;
            /** @default false */
            promo: boolean;
            seo?: components["schemas"]["SeoTextsRequest"];
            /** @description Optional on create (derived from the Uzbek name). */
            slug?: string;
            /** @default hidden */
            status: components["schemas"]["ProductStatusEnum"];
            texts?: components["schemas"]["ProductTextsPatchRequest"];
        };
        /** @description ``POST segments/`` (``name`` 2..60 unique, ``rules``) and ``PATCH segments/{id}/`` (partial). */
        PatchedSegmentWriteRequest: {
            name?: string;
            rules?: components["schemas"]["SegmentRulesRequest"];
        };
        /**
         * @description ``PATCH staff/{id}/`` body: ``full_name``, ``is_manager`` and/or ``email`` (the login address: the
         *     same account, open password links are revoked); ``is_active`` and ``password`` → ``read_only``.
         */
        PatchedStaffUpdateRequest: {
            /** Format: email */
            email?: string;
            full_name?: string;
            is_manager?: boolean;
        };
        /** @description One ``GET payments/`` row; ``refunds`` come from the view's per-page lookup (newest first). */
        Payment: {
            amount: number;
            /** Format: date-time */
            confirmed_at: string | null;
            /** Format: date-time */
            created_at: string;
            customer: components["schemas"]["CustomerRef"];
            id: number;
            order_id: number;
            provider: components["schemas"]["PaymentProviderEnum"];
            readonly refunds: components["schemas"]["Refund"][];
            status: components["schemas"]["PaymentStatusEnum"];
            readonly transaction_id: string | null;
        };
        /**
         * @description * `click` - click
         *     * `payme` - payme
         *     * `uzum` - uzum
         * @enum {string}
         */
        PaymentProviderEnum: "click" | "payme" | "uzum";
        /**
         * @description * `pending` - pending
         *     * `paid` - paid
         *     * `failed` - failed
         *     * `refunded` - refunded
         * @enum {string}
         */
        PaymentStatusEnum: "pending" | "paid" | "failed" | "refunded";
        PaymentSummary: {
            provider: components["schemas"]["PaymentProviderEnum"];
            status: components["schemas"]["PaymentStatusEnum"];
        };
        PendingSummary: {
            count: number;
            /** Format: date-time */
            next_at: string | null;
        };
        PlatformValues: {
            android: string;
            ios: string;
        };
        /** @description Contract §2.7 ``PolicyVersion`` (state derived at ``context["now"]``). */
        PolicyVersion: {
            author: components["schemas"]["Actor"] | null;
            basis: components["schemas"]["RateBasisEnum"];
            /** Format: date-time */
            created_at: string;
            earn_on_cashback_paid: boolean;
            /** Format: date-time */
            effective_from: string;
            /** Format: date-time */
            effective_to: string | null;
            readonly state: components["schemas"]["PolicyVersionStateEnum"];
            superseded_by: number | null;
            readonly tiers: components["schemas"]["CashbackTier"][];
            version: number;
        };
        /** @description ``POST cashback/policy-versions/`` 201. */
        PolicyVersionCreated: {
            superseded_version: number | null;
            version: components["schemas"]["PolicyVersion"];
            warnings: components["schemas"]["TierWarning"][];
        };
        /** @description ``POST cashback/policy-versions/`` body; the §2.7 rules run in ``create_policy_version``. */
        PolicyVersionCreateRequest: {
            basis: components["schemas"]["RateBasisEnum"];
            earn_on_cashback_paid: boolean;
            /** Format: date-time */
            effective_from: string;
            tiers: components["schemas"]["CashbackTierInputRequest"][];
        };
        /**
         * @description * `active` - active
         *     * `scheduled` - scheduled
         *     * `expired` - expired
         *     * `superseded` - superseded
         * @enum {string}
         */
        PolicyVersionStateEnum: "active" | "scheduled" | "expired" | "superseded";
        /** @description Contract §2.3 ``Product``; instances come from ``selectors.product_queryset()``. */
        Product: {
            billz_id: string;
            billz_name: string;
            billz_price: number | null;
            readonly category: string | null;
            /** Format: date-time */
            created_at: string;
            id: number;
            readonly images: components["schemas"]["ProductImage"][];
            is_new_from_billz: boolean;
            readonly last_change: components["schemas"]["LastChange"] | null;
            /**
             * Format: uri
             * @description 1000 px WebP variant.
             */
            readonly main_image_medium_url: string | null;
            /**
             * Format: uri
             * @description 400 px WebP variant.
             */
            readonly main_image_thumbnail_url: string | null;
            /** Format: uri */
            readonly main_image_url: string | null;
            price: number;
            promo: boolean;
            readonly seo: components["schemas"]["SeoTexts"];
            readonly seo_status: components["schemas"]["SeoStatus"];
            /** @description The website URL segment (B-W1): unique, editable. */
            slug: string;
            status: components["schemas"]["ProductStatusEnum"];
            readonly stock: number;
            readonly texts: components["schemas"]["ProductTexts"];
            /** Format: date-time */
            updated_at: string;
            volume: string;
        };
        ProductCard: {
            available: number;
            category: components["schemas"]["ProductCategory"] | null;
            /**
             * @description Language of `name` (and, where set, the other texts): the requested language, or `uz` when the name fell back to Uzbek or to the Billz name.
             *
             *     * `uz` - uz
             *     * `ru` - ru
             *     * `en` - en
             */
            content_language: components["schemas"]["ContentLanguageEnum"];
            id: number;
            in_cart_quantity: number;
            /**
             * Format: uri
             * @description 1000 px WebP variant.
             */
            main_image_medium_url: string | null;
            /**
             * Format: uri
             * @description 400 px WebP variant.
             */
            main_image_thumbnail_url: string | null;
            /** Format: uri */
            main_image_url: string | null;
            name: string;
            price: number;
            promo: boolean;
            /** @description The Billz product id / barcode (`billz_id`), the shop's article code; null if unknown. */
            sku: string | null;
            /** @description The website URL segment (B-W1); `catalog/products/{slug}/`. */
            slug: string;
            stock_status: components["schemas"]["StockStatusEnum"];
            /**
             * Format: date-time
             * @description Last change of the product page (sitemap `lastmod`).
             */
            updated_at: string;
            volume: string;
        };
        ProductCategory: {
            name: string;
            slug: string;
        };
        /**
         * @description * `created` - created
         *     * `price_changed` - price_changed
         *     * `activated` - activated
         *     * `hidden` - hidden
         *     * `promo_added` - promo_added
         *     * `promo_removed` - promo_removed
         *     * `updated` - updated
         * @enum {string}
         */
        ProductChangeKindEnum: "created" | "price_changed" | "activated" | "hidden" | "promo_added" | "promo_removed" | "updated";
        ProductDetail: {
            available: number;
            category: components["schemas"]["ProductCategory"] | null;
            /**
             * @description Language of `name` (and, where set, the other texts): the requested language, or `uz` when the name fell back to Uzbek or to the Billz name.
             *
             *     * `uz` - uz
             *     * `ru` - ru
             *     * `en` - en
             */
            content_language: components["schemas"]["ContentLanguageEnum"];
            description: string;
            id: number;
            images: components["schemas"]["CustomerProductImage"][];
            in_cart_quantity: number;
            ingredients: string;
            /**
             * Format: uri
             * @description 1000 px WebP variant.
             */
            main_image_medium_url: string | null;
            /**
             * Format: uri
             * @description 400 px WebP variant.
             */
            main_image_thumbnail_url: string | null;
            /** Format: uri */
            main_image_url: string | null;
            max_quantity: number;
            name: string;
            price: number;
            promo: boolean;
            /** @description Staff-written meta description; "" = none. */
            seo_description: string;
            /** @description Staff-written page title in this language; "" = none. */
            seo_title: string;
            /** @description One-paragraph summary in this language (else Uzbek); "" = none. */
            short_description: string;
            /** @description The Billz product id / barcode (`billz_id`), the shop's article code; null if unknown. */
            sku: string | null;
            /** @description The website URL segment (B-W1); `catalog/products/{slug}/`. */
            slug: string;
            stock_status: components["schemas"]["StockStatusEnum"];
            /**
             * Format: date-time
             * @description Last change of the product page (sitemap `lastmod`).
             */
            updated_at: string;
            usage: string;
            volume: string;
        };
        /** @description Contract §2.3 ``ProductImage = {id, url, thumbnail_url, medium_url, position, alt}``. */
        ProductImage: {
            /** @description Alt text per language; "" = the product name is used. */
            readonly alt: components["schemas"]["ImageAlt"];
            id: number;
            /** @description 1000 px WebP variant. */
            readonly medium_url: string;
            position: number;
            /** @description 400 px WebP variant. */
            readonly thumbnail_url: string;
            readonly url: string;
        };
        ProductImageUploadRequest: {
            /** Format: binary */
            file: string;
        };
        /** @description Contract §2.3 ``GET products/stats/``. */
        ProductStats: {
            active: number;
            billz: components["schemas"]["BillzStatus"];
            hidden: number;
            new_from_billz: number;
            out_of_stock: number;
            total: number;
        };
        /**
         * @description * `active` - active
         *     * `hidden` - hidden
         * @enum {string}
         */
        ProductStatusEnum: "active" | "hidden";
        /** @description One language of ``texts``: ``{name, short_description, description, ingredients, usage}``. */
        ProductText: {
            description?: string;
            ingredients?: string;
            name?: string;
            short_description?: string;
            usage?: string;
        };
        /** @description One language of ``texts``: ``{name, short_description, description, ingredients, usage}``. */
        ProductTextRequest: {
            description?: string;
            ingredients?: string;
            name?: string;
            short_description?: string;
            usage?: string;
        };
        /** @description Language-first product texts ``{uz: {...}, ru: {...}, en: {...}}`` (AGENTS.md: not ``i18n_text``). */
        ProductTexts: {
            en?: components["schemas"]["ProductText"];
            ru?: components["schemas"]["ProductText"];
            uz: components["schemas"]["ProductUzText"];
        };
        /** @description ``texts`` of ``PATCH products/{id}/``: any subset of languages and leaves (§2.3 leaf merge). */
        ProductTextsPatchRequest: {
            en?: components["schemas"]["ProductTextRequest"];
            ru?: components["schemas"]["ProductTextRequest"];
            uz?: components["schemas"]["ProductUzTextPatchRequest"];
        };
        /** @description Language-first product texts ``{uz: {...}, ru: {...}, en: {...}}`` (AGENTS.md: not ``i18n_text``). */
        ProductTextsRequest: {
            en?: components["schemas"]["ProductTextRequest"];
            ru?: components["schemas"]["ProductTextRequest"];
            uz: components["schemas"]["ProductUzTextRequest"];
        };
        /** @description The Uzbek texts: ``name`` is mandatory on create and, whenever sent, trimmed 2..120 characters. */
        ProductUzText: {
            description?: string;
            ingredients?: string;
            name: string;
            short_description?: string;
            usage?: string;
        };
        /** @description PATCH leaf merge: every Uzbek leaf is optional; a sent ``name`` keeps the 2..120 rule. */
        ProductUzTextPatchRequest: {
            description?: string;
            ingredients?: string;
            name?: string;
            short_description?: string;
            usage?: string;
        };
        /** @description The Uzbek texts: ``name`` is mandatory on create and, whenever sent, trimmed 2..120 characters. */
        ProductUzTextRequest: {
            description?: string;
            ingredients?: string;
            name: string;
            short_description?: string;
            usage?: string;
        };
        /**
         * @description Body of ``POST products/`` (every rule of the §2.3 table) and ``PATCH products/{id}/`` (``partial``).
         *
         *     ``context["billz"]`` may carry a ``BillzPort`` (tests); otherwise the configured adapter is used.
         */
        ProductWriteRequest: {
            billz_id: string;
            category?: string | null;
            price: number;
            /** @default false */
            promo: boolean;
            seo?: components["schemas"]["SeoTextsRequest"];
            /** @description Optional on create (derived from the Uzbek name). */
            slug?: string;
            /** @default hidden */
            status: components["schemas"]["ProductStatusEnum"];
            texts: components["schemas"]["ProductTextsRequest"];
        };
        /**
         * @description * `done` - done
         *     * `current` - current
         *     * `upcoming` - upcoming
         *     * `skipped` - skipped
         * @enum {string}
         */
        ProgressStateEnum: "done" | "current" | "upcoming" | "skipped";
        /**
         * @description * `placed` - placed
         *     * `paid` - paid
         *     * `with_courier` - with_courier
         *     * `delivered` - delivered
         *     * `picked_up` - picked_up
         *     * `cancelled` - cancelled
         * @enum {string}
         */
        ProgressStepEnum: "placed" | "paid" | "with_courier" | "delivered" | "picked_up" | "cancelled";
        /** @description Per-provider adapter modes (``*_MODE`` settings, each defaulting to ``INTEGRATIONS_MODE``). */
        ProviderModes: {
            ai: components["schemas"]["IntegrationModeEnum"];
            billz: components["schemas"]["IntegrationModeEnum"];
            bts: components["schemas"]["IntegrationModeEnum"];
            click: components["schemas"]["IntegrationModeEnum"];
            devsms: components["schemas"]["IntegrationModeEnum"];
            email: components["schemas"]["IntegrationModeEnum"];
            fcm: components["schemas"]["IntegrationModeEnum"];
            oauth: components["schemas"]["IntegrationModeEnum"];
            payme: components["schemas"]["IntegrationModeEnum"];
            uzum: components["schemas"]["IntegrationModeEnum"];
            vault: components["schemas"]["IntegrationModeEnum"];
            yandex: components["schemas"]["IntegrationModeEnum"];
        };
        ProviderReadiness: {
            /** @description The live adapter can be built and its `is_configured()` (where the port has one) says yes; `false` makes readiness answer 503. */
            configured: boolean;
            /** @description Seconds since `last_sync_at`; `null` with it. */
            last_sync_age_seconds: number | null;
            /**
             * Format: date-time
             * @description Billz and BTS only: the last successful catalog sync / polling run; `null` otherwise.
             */
            last_sync_at: string | null;
        };
        PublicDelivery: {
            default_provider: (components["schemas"]["DeliveryProviderEnum"] | components["schemas"]["NullEnum"]) | null;
            /** @description Home-delivery carriers that can take an order now, in preference order. */
            providers: components["schemas"]["DeliveryProviderEnum"][];
        };
        PublicSettings: {
            booking_policy: string;
            cosmetologist_phone: string | null;
            delivery: components["schemas"]["PublicDelivery"];
            fulfilment_methods: components["schemas"]["FulfilmentMethodEnum"][];
            /** Format: uri */
            instagram_url: string | null;
            min_app_version: components["schemas"]["PlatformValues"];
            online_sales_enabled: boolean;
            payment_providers: components["schemas"]["PaymentProviderEnum"][];
            pickup_address: string;
            privacy_policy: string;
            reservation_minutes: number;
            store_phone: string | null;
            store_urls: components["schemas"]["PlatformValues"];
            support_phone: string | null;
            /** Format: uri */
            telegram_url: string | null;
            terms: string;
            /** Format: date-time */
            terms_updated_at: string | null;
            terms_version: string | null;
            /** Format: uri */
            website_url: string | null;
        };
        /**
         * @description * `account` - account
         *     * `name` - name
         *     * `discipline` - discipline
         *     * `bio` - bio
         *     * `photo` - photo
         *     * `clinic` - clinic
         *     * `service` - service
         *     * `availability` - availability
         * @enum {string}
         */
        PublishBlockersEnum: "account" | "name" | "discipline" | "bio" | "photo" | "clinic" | "service" | "availability";
        /** @description Contract §2.6 ``Purchase``. */
        Purchase: {
            amount: number;
            /** Format: date-time */
            at: string;
            billz_sale_ref: string | null;
            cashback: number;
            id: number;
            order_id: number | null;
            policy_version: number | null;
            promo_amount: number;
            reversed: boolean;
            source: components["schemas"]["PurchaseSourceEnum"];
        };
        /**
         * @description * `online` - online
         *     * `store_qr` - store_qr
         * @enum {string}
         */
        PurchaseSourceEnum: "online" | "store_qr";
        QrToken: {
            /** Format: date-time */
            expires_at: string;
            refresh_in_seconds: number;
            /** @description "GD1:" + base64url(16 random bytes); single use. */
            token: string;
            ttl_seconds: number;
        };
        RangeDay: {
            counts: components["schemas"]["RangeStatusCounts"];
            /** Format: date */
            date: string;
            /** @description Earliest start and latest end of the listed specialists working that day; null when nobody works. */
            readonly hours: components["schemas"]["WorkingHours"] | null;
            total: number;
            /** @description At least one listed specialist works that day. */
            working: boolean;
        };
        RangeSchedule: {
            blocks: components["schemas"]["DayBlock"][];
            /** Format: date */
            date: string;
            location: components["schemas"]["AppointmentClinic"] | null;
            specialist_id: number;
            readonly working_hours: components["schemas"]["WorkingHours"] | null;
        };
        RangeSpecialist: {
            id: number;
            is_active: boolean;
            name: string;
            role: components["schemas"]["SpecialistRoleEnum"];
        };
        RangeStatusCounts: {
            attended: number;
            cancelled: number;
            confirmed: number;
            rejected: number;
            requested: number;
        };
        /**
         * @description * `before_purchase` - before_purchase
         *     * `with_purchase` - with_purchase
         * @enum {string}
         */
        RateBasisEnum: "before_purchase" | "with_purchase";
        Read: {
            id: number;
            /** Format: date-time */
            read_at: string;
            unread_count: number;
        };
        ReadAll: {
            unread_count: number;
            updated: number;
        };
        /** @description ``DELETE me/`` and ``DELETE me/social/{provider}/``: the password, or an SMS verification token. */
        ReauthRequest: {
            password?: string | null;
            verification_token?: string | null;
        };
        RefreshRequest: {
            refresh: string;
        };
        RefreshResponse: {
            access: string;
            /** Format: date-time */
            access_expires_at: string;
            refresh: string;
            /** Format: date-time */
            refresh_expires_at: string;
        };
        /**
         * @description Contract ``Refund`` (§2.2): ``completed_at`` is set on ``succeeded`` only; ``manual_reason`` (M3) says
         *     why a refund is manual (§5.1 picks the refund-state line by it).
         */
        Refund: {
            amount: number;
            /** Format: date-time */
            completed_at: string | null;
            id: number;
            /**
             * @description Why the refund is (or was) `manual_required`: `payme` (a Payme cabinet refund), `no_paydoc` (a Click payment without Click's payment id), `fake_mode` (Click fake under the production settings), `uzum_fake` (Uzum fake under the production settings); `null` for a refund that was never manual.
             *
             *     * `payme` - payme
             *     * `no_paydoc` - no_paydoc
             *     * `fake_mode` - fake_mode
             *     * `uzum_fake` - uzum_fake
             */
            manual_reason: (components["schemas"]["ManualReasonEnum"] | components["schemas"]["NullEnum"]) | null;
            provider: components["schemas"]["PaymentProviderEnum"];
            /** Format: date-time */
            requested_at: string;
            state: components["schemas"]["RefundStateEnum"];
            /** Format: date-time */
            updated_at: string;
        };
        /**
         * @description * `requested` - requested
         *     * `submitting` - submitting
         *     * `succeeded` - succeeded
         *     * `failed` - failed
         *     * `manual_required` - manual_required
         *     * `unknown` - unknown
         * @enum {string}
         */
        RefundStateEnum: "requested" | "submitting" | "succeeded" | "failed" | "manual_required" | "unknown";
        Region: {
            cities: components["schemas"]["City"][];
            code: string;
            name: string;
        };
        RegionCatalog: {
            regions: components["schemas"]["Region"][];
            /** Format: date-time */
            updated_at: string | null;
        };
        /**
         * @description * `app` - app
         *     * `admin` - admin
         * @enum {string}
         */
        RequestedViaEnum: "app" | "admin";
        ResetPasswordRequest: {
            password: string;
            verification_token: string;
        };
        ResolvedQr: {
            available: number;
            customer_ref: string;
            /** Format: decimal */
            percent: string | null;
            phone: string;
            phone_mask: string;
            /** Format: date-time */
            resolved_at: string;
        };
        ResolveIssueRequest: {
            note: string;
        };
        ResolveQrRequest: {
            sale_ref?: string | null;
            token: string;
        };
        /**
         * @description ``{state: succeeded | failed, manual_payout?: bool}`` (a ``CharField`` so the schema keeps one
         *     ``RefundStateEnum``); ``manual_payout`` (admin §7 item 18, M2) closes a ``failed`` Click refund Click
         *     still reports ``paid`` after staff paid the customer outside Click; ignored for other refunds.
         */
        ResolveRefundRequest: {
            /**
             * @description Staff paid the customer outside Click (closing a `failed` Click refund Click reports `paid`).
             * @default false
             */
            manual_payout: boolean;
            /** @description `succeeded` or `failed` */
            state: string;
        };
        RevokedSessions: {
            revoked: number;
        };
        /** @description ``GET specialists/{id}/conflicts/``: open future appointments the schedule no longer covers. */
        ScheduleConflicts: {
            results: components["schemas"]["AppointmentItem"][];
        };
        /** @description Contract §2.8 ``Segment``; the counts come from ``selectors.segment_stats``. */
        Segment: {
            /** Format: date-time */
            created_at: string;
            id: number;
            readonly manual_member_count: number;
            readonly member_count: number;
            name: string;
            readonly rules: components["schemas"]["SegmentRules"];
            readonly size: number;
            /** Format: date-time */
            updated_at: string;
        };
        /**
         * @description ``POST segments/{id}/members/`` (contract §2.8): ``customer_ids`` (any status, must exist) and/or
         *     ``phones`` (E.164, resolved to **active** customers), each ≤ 500 and deduplicated.
         */
        SegmentMembersInputRequest: {
            customer_ids?: number[];
            phones?: string[];
        };
        SegmentRules: {
            min_lifetime_amount?: number | null;
            min_online_orders?: number | null;
        };
        SegmentRulesRequest: {
            min_lifetime_amount?: number | null;
            min_online_orders?: number | null;
        };
        /** @description ``POST segments/`` (``name`` 2..60 unique, ``rules``) and ``PATCH segments/{id}/`` (partial). */
        SegmentWriteRequest: {
            name: string;
            rules?: components["schemas"]["SegmentRulesRequest"];
        };
        /**
         * @description ``phone`` **or** ``email`` (hybrid identity, customer contract §2.1): exactly one per call. Neither →
         *     ``phone`` ``required`` (``field.identifier_required``); both → ``email`` ``invalid``
         *     (``field.identifier_ambiguous``). ``validated_data["identifier"]`` is the one given (an address holds
         *     ``@``, a phone never does).
         */
        SendCodeRequest: {
            email?: string | null;
            phone?: string | null;
            purpose: components["schemas"]["OtpPurposeEnum"];
            social_ticket?: string | null;
        };
        /** @description ``POST notifications/{id}/test/``: the active test devices to push the current revision to. */
        SendTestInputRequest: {
            device_ids: number[];
        };
        SeoIssue: {
            code: components["schemas"]["SeoIssueCodeEnum"];
            language: (components["schemas"]["ContentLanguageEnum"] | components["schemas"]["NullEnum"]) | null;
            message: string;
            severity: components["schemas"]["SeoSeverityEnum"];
        };
        /**
         * @description * `name_missing` - name_missing
         *     * `name_translation_missing` - name_translation_missing
         *     * `description_missing` - description_missing
         *     * `description_short` - description_short
         *     * `images_missing` - images_missing
         *     * `alt_text_fallback` - alt_text_fallback
         *     * `category_missing` - category_missing
         *     * `seo_title_missing` - seo_title_missing
         *     * `seo_title_short` - seo_title_short
         *     * `seo_title_long` - seo_title_long
         *     * `seo_description_missing` - seo_description_missing
         *     * `seo_description_short` - seo_description_short
         *     * `seo_description_long` - seo_description_long
         *     * `image_missing` - image_missing
         *     * `no_active_products` - no_active_products
         * @enum {string}
         */
        SeoIssueCodeEnum: "name_missing" | "name_translation_missing" | "description_missing" | "description_short" | "images_missing" | "alt_text_fallback" | "category_missing" | "seo_title_missing" | "seo_title_short" | "seo_title_long" | "seo_description_missing" | "seo_description_short" | "seo_description_long" | "image_missing" | "no_active_products";
        /**
         * @description * `error` - error
         *     * `warning` - warning
         *     * `info` - info
         * @enum {string}
         */
        SeoSeverityEnum: "error" | "warning" | "info";
        /**
         * @description «SEO holati» (B-W1): ``ok`` = no error and no warning; ``issues`` errors first, then warnings, then
         *     hints (``info``: a fallback is used).
         */
        SeoStatus: {
            issues: components["schemas"]["SeoIssue"][];
            ok: boolean;
        };
        /**
         * @description One language of ``seo`` (B-W1): the page ``title`` (≤120) and meta ``description`` (≤300); ``""`` =
         *     the website builds one from the name and description.
         */
        SeoText: {
            description?: string;
            title?: string;
        };
        /**
         * @description One language of ``seo`` (B-W1): the page ``title`` (≤120) and meta ``description`` (≤300); ``""`` =
         *     the website builds one from the name and description.
         */
        SeoTextRequest: {
            description?: string;
            title?: string;
        };
        /**
         * @description Language-first ``seo`` ``{uz: {title, description}, ru: …, en: …}``; every language and leaf optional
         *     on write (merged leaf by leaf, like ``texts``).
         */
        SeoTexts: {
            en?: components["schemas"]["SeoText"];
            ru?: components["schemas"]["SeoText"];
            uz?: components["schemas"]["SeoText"];
        };
        /**
         * @description Language-first ``seo`` ``{uz: {title, description}, ru: …, en: …}``; every language and leaf optional
         *     on write (merged leaf by leaf, like ``texts``).
         */
        SeoTextsRequest: {
            en?: components["schemas"]["SeoTextRequest"];
            ru?: components["schemas"]["SeoTextRequest"];
            uz?: components["schemas"]["SeoTextRequest"];
        };
        /**
         * @description * `dermatology` - dermatology
         *     * `cosmetology` - cosmetology
         * @enum {string}
         */
        ServiceCategoryEnum: "dermatology" | "cosmetology";
        /** @description ``description``: ``{uz, ru, en}``, each ≤ 2000, optional. */
        ServiceDescriptionRequest: {
            /** @default  */
            en: string;
            /** @default  */
            ru: string;
            /** @default  */
            uz: string;
        };
        ServiceList: {
            results: components["schemas"]["ServiceOffer"][];
        };
        /** @description ``name``: ``uz`` trimmed 2..120 required on create; ``ru`` / ``en`` ≤ 120 optional. */
        ServiceNameRequest: {
            /** @default  */
            en: string;
            /** @default  */
            ru: string;
            uz: string;
        };
        ServiceOffer: {
            category: components["schemas"]["ServiceCategoryEnum"];
            readonly category_label: string;
            readonly description: string;
            /** @description Duration in minutes. */
            duration_min: number;
            id: number;
            readonly name: string;
            /** @description The specialist's price (equal to `price_to`). */
            price_from: number;
            /** @description The specialist's price (equal to `price_from`). */
            price_to: number;
            readonly short_name: string;
            /** @description The one specialist who offers this service. */
            specialist_ids: number[];
        };
        /**
         * @description ``short_name``: ``uz`` 1..40 (defaults to the first 40 characters of ``name.uz`` on create); ``ru`` /
         *     ``en`` ≤ 40 optional.
         */
        ServiceShortNameRequest: {
            /** @default  */
            en: string;
            /** @default  */
            ru: string;
            uz: string;
        };
        SetPasswordRequest: {
            language?: (components["schemas"]["ContentLanguageEnum"] | components["schemas"]["NullEnum"]) | null;
            name: string;
            password: string;
            terms_version: string;
            verification_token: string;
        };
        Shipment: components["schemas"]["ShipmentNotRequired"] | components["schemas"]["ShipmentNotCreated"] | components["schemas"]["ShipmentFailed"] | components["schemas"]["ShipmentCreated"];
        ShipmentCreated: {
            /**
             * @description `created` (enum property replaced by openapi-typescript)
             * @enum {string}
             */
            state: "created";
            tariff: number;
            tracking_number: string;
            /** Format: date-time */
            updated_at: string;
            via: components["schemas"]["ShipmentViaEnum"];
        };
        ShipmentFailed: {
            attempts: number;
            /** Format: date-time */
            last_attempt_at: string;
            pending: boolean;
            /**
             * @description `failed` (enum property replaced by openapi-typescript)
             * @enum {string}
             */
            state: "failed";
        };
        ShipmentNotCreated: {
            pending: boolean;
            /**
             * @description `not_created` (enum property replaced by openapi-typescript)
             * @enum {string}
             */
            state: "not_created";
        };
        ShipmentNotRequired: {
            /**
             * @description `not_required` (pickup) (enum property replaced by openapi-typescript)
             * @enum {string}
             */
            state: "not_required";
        };
        /**
         * @description * `awaiting_dispatch` - awaiting_dispatch
         *     * `courier_requested` - courier_requested
         *     * `courier_assigned` - courier_assigned
         *     * `courier_arrived` - courier_arrived
         *     * `in_transit` - in_transit
         *     * `at_destination` - at_destination
         *     * `delivered` - delivered
         *     * `returning` - returning
         *     * `returned` - returned
         *     * `cancelled` - cancelled
         *     * `failed` - failed
         * @enum {string}
         */
        ShipmentStageEnum: "awaiting_dispatch" | "courier_requested" | "courier_assigned" | "courier_arrived" | "in_transit" | "at_destination" | "delivered" | "returning" | "returned" | "cancelled" | "failed";
        /**
         * @description * `webhook` - webhook
         *     * `polling` - polling
         * @enum {string}
         */
        ShipmentViaEnum: "webhook" | "polling";
        Slot: {
            /** @description "HH:MM" Tashkent. */
            end: string;
            /** @description "HH:MM" Tashkent. */
            start: string;
            /** Format: date-time */
            start_at: string;
        };
        SlotWorkingHours: {
            end: string;
            start: string;
        };
        /** @description Body of ``PUT categories/order/``. */
        SlugOrderRequest: {
            slugs: string[];
        };
        SocialCompleteRequest: {
            language?: (components["schemas"]["ContentLanguageEnum"] | components["schemas"]["NullEnum"]) | null;
            name?: string | null;
            password?: string | null;
            social_ticket: string;
            terms_version?: string | null;
            verification_token?: string | null;
        };
        /**
         * @description * `google` - google
         *     * `facebook` - facebook
         * @enum {string}
         */
        SocialProviderEnum: "google" | "facebook";
        SocialRequest: {
            authorization_code?: string | null;
            nonce?: string | null;
            provider: components["schemas"]["CustomerSocialProviderEnum"];
            token: string;
            token_type?: (components["schemas"]["SocialTokenTypeEnum"] | components["schemas"]["NullEnum"]) | null;
        };
        /**
         * @description * `id_token` - id_token
         *     * `access_token` - access_token
         * @enum {string}
         */
        SocialTokenTypeEnum: "id_token" | "access_token";
        Specialist: {
            readonly bio: string;
            /** @description Language of `bio` (else of `qualifications`): the requested language, or `uz` when it fell back to Uzbek. `name` is the same in every language. */
            readonly content_language: components["schemas"]["ContentLanguageEnum"];
            experience_years: number | null;
            id: number;
            readonly locations: components["schemas"]["Location"][];
            name: string;
            /**
             * Format: uri
             * @description 1000 px WebP variant.
             */
            readonly photo_medium_url: string | null;
            /**
             * Format: uri
             * @description 400 px WebP variant.
             */
            readonly photo_thumbnail_url: string | null;
            readonly photo_url: string | null;
            readonly qualifications: string;
            role: components["schemas"]["SpecialistRoleEnum"];
            readonly role_label: string;
            readonly services: components["schemas"]["SpecialistService"][];
            slot_step_min: number;
            /** @description The website URL segment (B-W1); `specialists/{slug}/`. */
            slug: string;
            /**
             * Format: date-time
             * @description Last change of the specialist (sitemap `lastmod`).
             */
            updated_at: string;
        };
        /** @description The owner account of a profile: its login, its current role and whether it may sign in. */
        SpecialistAccount: {
            readonly display_name: string;
            /** Format: email */
            email: string;
            id: number;
            is_active: boolean;
            role: components["schemas"]["StaffRoleEnum"];
        };
        /**
         * @description ``POST specialist/appointments/``: a booking in the caller's own calendar. No ``customer_id`` (a
         *     specialist cannot address customers by id) and no note (the staff note is never shown to a specialist).
         *     A ``phone`` no customer holds books a walk-in: ``name`` is then required and the customer is created with
         *     the booking (no password, no consent: they sign in later with an SMS code to that phone).
         */
        SpecialistAppointmentCreateRequest: {
            /** @description One of the caller's active assigned clinics. */
            location_id: number;
            /** @description The new customer's name, required when no customer has the phone (a walk-in). */
            name?: string;
            /** @description An Uzbek mobile number; separators and a missing +998 are accepted and the value is normalised to E.164 (+998XXXXXXXXX). */
            phone: string;
            /** @description One of the caller's own active services. */
            service_id: number;
            /** Format: date-time */
            start: string;
        };
        /** @description ``GET specialist/appointments/?date=``: the admin day shape with ``specialists`` = the caller. */
        SpecialistAppointmentDay: {
            appointments: components["schemas"]["SpecialistAppointmentItem"][];
            /** Format: date */
            date: string;
            specialists: components["schemas"]["SpecialistDay"][];
        };
        /**
         * @description ``SpecialistAppointmentItem``: the admin day item with ``customer`` reduced to ``{id, name, phone}``,
         *     plus ``customer_note`` and ``allowed_actions``.
         */
        SpecialistAppointmentItem: {
            /** @description What the specialist may do now: confirm / reject / reschedule / cancel before the start (as the status allows), attend from the start on. */
            readonly allowed_actions: components["schemas"]["AllowedActionsEnum"][];
            customer: components["schemas"]["SpecialistCustomerRef"];
            customer_note: string;
            duration_min: number;
            /** Format: date-time */
            end: string;
            id: number;
            location: components["schemas"]["AppointmentClinic"];
            price: number;
            /** Format: date-time */
            requested_at: string;
            requested_via: components["schemas"]["RequestedViaEnum"];
            service_id: number;
            service_name: string;
            service_short_name: string;
            specialist_id: number;
            /** Format: date-time */
            start: string;
            status: components["schemas"]["AppointmentStatusEnum"];
        };
        /** @description ``GET specialist/appointments/range/``: the admin range shape of the caller's own board. */
        SpecialistAppointmentRange: {
            appointments: components["schemas"]["SpecialistAppointmentItem"][] | null;
            days: components["schemas"]["RangeDay"][];
            /** Format: date */
            from: string;
            schedules: components["schemas"]["RangeSchedule"][] | null;
            specialists: components["schemas"]["RangeSpecialist"][];
            /** Format: date */
            to: string;
        };
        SpecialistAvailability: {
            blocks: components["schemas"]["BlockedPeriod"][];
            /** @description Assigned clinics, primary first, inactive ones included (`is_active`). */
            clinics: components["schemas"]["ClinicLocation"][];
            overrides: components["schemas"]["HoursOverride"][];
            working_hours: components["schemas"]["WorkingDay"][];
        };
        SpecialistConflicts: {
            results: components["schemas"]["SpecialistAppointmentItem"][];
        };
        /** @description ``CustomerRef`` without the e-mail: a specialist sees who comes and how to call them. */
        SpecialistCustomerRef: {
            id: number;
            name: string;
            phone: string | null;
        };
        SpecialistDay: {
            blocks: components["schemas"]["DayBlock"][];
            id: number;
            is_active: boolean;
            location: components["schemas"]["AppointmentClinic"] | null;
            name: string;
            role: components["schemas"]["SpecialistRoleEnum"];
            readonly working_hours: components["schemas"]["WorkingHours"] | null;
        };
        /**
         * @description ``POST staff/`` (201) and ``POST staff/{id}/reset-password/`` (200): the account, its temporary
         *     password (shown once) and/or the e-mailed link.
         */
        SpecialistInviteCredentials: {
            /** @description The e-mailed link (`delivery` `email_link` or `both`), else `null`. */
            activation: components["schemas"]["Activation"] | null;
            /** @description The draft profile created with the account. */
            specialist_id: number;
            staff: components["schemas"]["StaffMember"];
            /** @description Shown once (`delivery` `temporary_password` or `both`, else `null`); the person signs in with it and must then set their own password. A replay of the same `Idempotency-Key` returns it again (stored sealed, §1.7). */
            temporary_password: string | null;
        };
        SpecialistList: {
            results: components["schemas"]["Specialist"][];
        };
        /**
         * @description ``SpecialistOwnProfile``: the ``ClinicSpecialist`` of the signed-in specialist plus the clinics staff
         *     assigned (read-only for the specialist).
         */
        SpecialistOwnProfile: {
            /** @description The account that owns the profile. */
            account: components["schemas"]["SpecialistAccount"];
            readonly bio: components["schemas"]["I18nText2000"];
            /** @description Assigned clinics, primary first, inactive ones included (`is_active`). */
            readonly clinics: components["schemas"]["ClinicLocation"][];
            /** Format: date-time */
            created_at: string;
            experience_years: number | null;
            id: number;
            is_active: boolean;
            /** @description `null` while a draft has no clinic. */
            location_id: number | null;
            readonly location_ids: number[];
            name: string;
            /**
             * Format: uri
             * @description 1000 px WebP variant.
             */
            readonly photo_medium_url: string | null;
            /**
             * Format: uri
             * @description 400 px WebP variant.
             */
            readonly photo_thumbnail_url: string | null;
            /** Format: uri */
            readonly photo_url: string | null;
            position: number;
            /** @description What keeps the profile from being published (`[]` = ready): account, name, discipline, bio, photo, clinic, service, availability. */
            readonly publish_blockers: components["schemas"]["PublishBlockersEnum"][];
            readonly qualifications: components["schemas"]["I18nText2000"];
            /**
             * @description `""` while a draft has none.
             *
             *     * `dermatologist` - dermatologist
             *     * `cosmetologist` - cosmetologist
             */
            role: components["schemas"]["SpecialistRoleEnum"] | components["schemas"]["BlankEnum"];
            /** @description Every own service, inactive ones included, by position. */
            services: components["schemas"]["ClinicService"][];
            slot_step_min: number;
            /** @description The website URL segment (B-W1): unique, editable. */
            slug: string;
            readonly upcoming_appointments: number;
            /** Format: date-time */
            updated_at: string;
            working_hours: components["schemas"]["WorkingDay"][];
        };
        SpecialistPhotoUploadRequest: {
            /** Format: binary */
            file: string;
        };
        SpecialistRescheduleRequest: {
            /** @default false */
            customer_agreed: boolean;
            location_id?: number;
            /** Format: date-time */
            start: string;
        };
        SpecialistRoleChangeRequest: {
            /** @description Must be `true`: the role change is a confirmed action. */
            confirmed: boolean;
            role: components["schemas"]["SpecialistRoleChangeRoleEnum"];
        };
        SpecialistRoleChangeResult: {
            account: components["schemas"]["StaffMember"];
            /** @description The profile the account owns; `null` for an account that never had one. */
            specialist_id: number | null;
            /** @description → staff: requested/confirmed visits ahead on the paused profile, for staff to handle. */
            upcoming_appointments: number;
        };
        /**
         * @description * `staff` - staff
         *     * `specialist` - specialist
         * @enum {string}
         */
        SpecialistRoleChangeRoleEnum: "staff" | "specialist";
        /**
         * @description * `dermatologist` - dermatologist
         *     * `cosmetologist` - cosmetologist
         * @enum {string}
         */
        SpecialistRoleEnum: "dermatologist" | "cosmetologist";
        SpecialistService: {
            duration_min: number;
            id: number;
            readonly name: string;
            price: number;
            readonly short_name: string;
        };
        /**
         * @description ``qualifications`` / ``bio``: ``{uz, ru, en}``, each ≤ 2000, every language optional (missing on
         *     create → ``""``; a PATCH changes only the languages sent).
         */
        SpecialistTextRequest: {
            /** @default  */
            en: string;
            /** @default  */
            ru: string;
            /** @default  */
            uz: string;
        };
        /** @description Create a staff account, optionally granting the manager role. */
        StaffCreateRequest: {
            /**
             * @description `temporary_password` (shown once in the answer), `email_link` (a single-use link to the account's e-mail; no usable password until it is used) or `both`. The e-mail options need `Me.capabilities.staff_email_invite` (else `invalid_choice`).
             *
             *     * `temporary_password` - temporary_password
             *     * `email_link` - email_link
             *     * `both` - both
             * @default temporary_password
             */
            delivery: components["schemas"]["StaffPasswordDeliveryEnum"];
            /** Format: email */
            email: string;
            full_name: string;
            /** @default false */
            is_manager: boolean;
            /** @default uz */
            language: components["schemas"]["ContentLanguageEnum"];
        };
        /**
         * @description ``POST staff/`` (201) and ``POST staff/{id}/reset-password/`` (200): the account, its temporary
         *     password (shown once) and/or the e-mailed link.
         */
        StaffCredentials: {
            /** @description The e-mailed link (`delivery` `email_link` or `both`), else `null`. */
            activation: components["schemas"]["Activation"] | null;
            staff: components["schemas"]["StaffMember"];
            /** @description Shown once (`delivery` `temporary_password` or `both`, else `null`); the person signs in with it and must then set their own password. A replay of the same `Idempotency-Key` returns it again (stored sealed, §1.7). */
            temporary_password: string | null;
        };
        /** @description ``StaffMember.invite``: the newest password link (invite or reset) of the account. */
        StaffInvite: {
            /** Format: date-time */
            expires_at: string | null;
            /**
             * Format: date-time
             * @description When the e-mail went to the relay; `null` while queued or when not sent.
             */
            sent_at: string | null;
            /**
             * @description `none` (never e-mailed a link), `pending` (open: queued or sent), `expired`, `used` (the person set a password with it), `revoked` (replaced by a newer link, a password change, a temporary-password reset or a deactivation).
             *
             *     * `none` - none
             *     * `pending` - pending
             *     * `expired` - expired
             *     * `used` - used
             *     * `revoked` - revoked
             */
            state: components["schemas"]["StaffInviteStateEnum"];
        };
        /**
         * @description * `none` - none
         *     * `pending` - pending
         *     * `expired` - expired
         *     * `used` - used
         *     * `revoked` - revoked
         * @enum {string}
         */
        StaffInviteStateEnum: "none" | "pending" | "expired" | "used" | "revoked";
        /** @description ``POST staff/{id}/send-password-link/`` (200). */
        StaffLinkSent: {
            activation: components["schemas"]["Activation"];
            staff: components["schemas"]["StaffMember"];
        };
        /**
         * @description One ``GET staff/`` row: the ``Actor`` keys plus ``email`` and ``is_active`` for every caller (the
         *     audit-log actor filter), and the manager's columns, which are ``null`` unless the caller is a manager
         *     (``context["manager"]``).
         */
        StaffListItem: {
            /**
             * Format: date-time
             * @description Manager only, else `null`.
             */
            created_at: string | null;
            readonly display_name: string;
            /** Format: email */
            email: string;
            /** @description Manager only, else `null`. */
            full_name: string | null;
            has_ops_console_access?: boolean | null;
            id: number;
            /** @description Manager only, else `null`. */
            readonly invite: components["schemas"]["StaffInvite"] | null;
            is_active: boolean;
            /** @description Manager only, else `null`. */
            is_manager: boolean | null;
            is_superuser?: boolean | null;
            /**
             * Format: date-time
             * @description Manager only, else `null`; `null` for a manager too when never signed in.
             */
            last_login_at: string | null;
            /** @description Manager only, else `null`. */
            readonly linked_providers: components["schemas"]["SocialProviderEnum"][] | null;
            /** @description A confirmed admin panel TOTP device (the staff screen's badge and «MFA ni o‘chirish»). Manager only, else `null`. */
            readonly mfa_enabled: boolean | null;
            /** @description Manager only, else `null`. */
            must_change_password: boolean | null;
            role: (components["schemas"]["StaffRoleEnum"] | components["schemas"]["NullEnum"]) | null;
        };
        /** @description ``StaffMember`` (§2.16): a staff account as managers see it; every write of ``staff/`` returns it. */
        StaffMember: {
            /** Format: date-time */
            created_at: string;
            readonly display_name: string;
            /** Format: email */
            email: string;
            full_name: string;
            has_ops_console_access?: boolean;
            id: number;
            readonly invite: components["schemas"]["StaffInvite"];
            is_active: boolean;
            is_manager: boolean;
            is_superuser?: boolean;
            /**
             * Format: date-time
             * @description `null`: never signed in.
             */
            last_login_at: string | null;
            readonly linked_providers: components["schemas"]["SocialProviderEnum"][];
            /** @description A confirmed admin panel TOTP device. */
            readonly mfa_enabled: boolean;
            /** @description The person must set their own password before using the admin panel. */
            must_change_password: boolean;
            /**
             * Format: date-time
             * @description When the person last set their own password (a link or `auth/change-password/`); `null`: never since this was recorded.
             */
            password_changed_at: string | null;
            role: components["schemas"]["StaffRoleEnum"];
        };
        /**
         * @description * `temporary_password` - temporary_password
         *     * `email_link` - email_link
         *     * `both` - both
         * @enum {string}
         */
        StaffPasswordDeliveryEnum: "temporary_password" | "email_link" | "both";
        /**
         * @description * `invite` - invite
         *     * `reset` - reset
         * @enum {string}
         */
        StaffPasswordPurposeEnum: "invite" | "reset";
        /**
         * @description ``POST staff/{id}/reset-mfa/`` body (optional): ``reason`` (trimmed, up to 200 characters), kept on
         *     the ``auth.mfa_reset`` audit entry.
         */
        StaffResetMfaRequest: {
            /** @default  */
            reason: string;
        };
        /** @description ``POST staff/{id}/reset-password/`` body (optional): ``delivery`` (default ``temporary_password``). */
        StaffResetPasswordRequest: {
            /**
             * @description `temporary_password` (shown once in the answer), `email_link` (a single-use link to the account's e-mail; no usable password until it is used) or `both`. The e-mail options need `Me.capabilities.staff_email_invite` (else `invalid_choice`).
             *
             *     * `temporary_password` - temporary_password
             *     * `email_link` - email_link
             *     * `both` - both
             * @default temporary_password
             */
            delivery: components["schemas"]["StaffPasswordDeliveryEnum"];
        };
        /**
         * @description * `admin` - admin
         *     * `specialist` - specialist
         * @enum {string}
         */
        StaffRoleEnum: "admin" | "specialist";
        StatusCounts: {
            all: number;
            awaiting_payment: number;
            cancelled: number;
            delivered: number;
            handed_to_courier: number;
            processing: number;
        };
        StatusTemplate: {
            status: components["schemas"]["TemplateStatusEnum"];
            readonly texts: components["schemas"]["TemplateTexts"];
            /** Format: date-time */
            updated_at: string;
            updated_by: components["schemas"]["Actor"] | null;
        };
        /**
         * @description * `in_stock` - in_stock
         *     * `out_of_stock` - out_of_stock
         * @enum {string}
         */
        StockStatusEnum: "in_stock" | "out_of_stock";
        /** @description The courier-dispatch switch: ``suspended`` is in effect now (``until`` passed → ``false``). */
        Suspension: {
            note: string;
            suspended: boolean;
            /** Format: date-time */
            until: string | null;
            /** Format: date-time */
            updated_at: string;
        };
        /** @description ``POST delivery/suspension/``: ``until`` (future, optional: until lifted) only while suspending. */
        SuspensionBodyRequest: {
            /** @default  */
            note: string;
            suspended: boolean;
            /** Format: date-time */
            until?: string | null;
        };
        /**
         * @description * `processing` - processing
         *     * `handed_to_courier` - handed_to_courier
         *     * `delivered` - delivered
         *     * `cancelled` - cancelled
         * @enum {string}
         */
        TemplateStatusEnum: "processing" | "handed_to_courier" | "delivered" | "cancelled";
        TemplateTexts: {
            en: string;
            ru: string;
            uz: string;
        };
        TemplateTextsRequest: {
            en: string;
            ru: string;
            uz: string;
        };
        TemplateUpdateRequest: {
            texts: components["schemas"]["TemplateTextsRequest"];
        };
        /** @description ``GET notifications/test-devices/`` rows (``selectors.test_devices`` annotates ``is_pushable``). */
        TestDevice: {
            /** Format: date-time */
            created_at: string;
            device_id: number;
            id: number;
            is_pushable: boolean;
            label: string;
            model: string;
            phone: string;
            platform: string;
            registered_by: components["schemas"]["Actor"] | null;
        };
        /** @description ``POST notifications/test-devices/``: the customer's phone and a label for the registry. */
        TestDeviceCreateRequest: {
            label: string;
            /** @description An Uzbek mobile number; separators and a missing +998 are accepted and the value is normalised to E.164 (+998XXXXXXXXX). */
            phone: string;
        };
        /** @description ``warnings[]``: ``gap`` = ``[from, to)`` uncovered; ``uncovered_above``: open top. */
        TierWarning: {
            code: components["schemas"]["TierWarningEnum"];
            from: number;
            to: number | null;
        };
        /**
         * @description * `gap` - gap
         *     * `uncovered_above` - uncovered_above
         * @enum {string}
         */
        TierWarningEnum: "gap" | "uncovered_above";
        /**
         * @description * `order_created` - order_created
         *     * `payment_confirmed` - payment_confirmed
         *     * `payment_failed` - payment_failed
         *     * `shipment_created` - shipment_created
         *     * `handed_to_courier` - handed_to_courier
         *     * `delivered` - delivered
         *     * `cancelled` - cancelled
         *     * `refund_in_progress` - refund_in_progress
         *     * `refund_succeeded` - refund_succeeded
         *     * `delivery_failed` - delivery_failed
         *     * `shipment_returned` - shipment_returned
         * @enum {string}
         */
        TimelineTypeEnum: "order_created" | "payment_confirmed" | "payment_failed" | "shipment_created" | "handed_to_courier" | "delivered" | "cancelled" | "refund_in_progress" | "refund_succeeded" | "delivery_failed" | "shipment_returned";
        TransitionRequest: {
            status: components["schemas"]["OrderStatusEnum"];
        };
        UnreadCount: {
            unread_count: number;
        };
        Verification: {
            customer_exists: boolean;
            expires_in: number;
            purpose: components["schemas"]["OtpPurposeEnum"];
            verification_token: string;
        };
        /**
         * @description ``phone`` **or** ``email`` (hybrid identity, customer contract §2.1): exactly one per call. Neither →
         *     ``phone`` ``required`` (``field.identifier_required``); both → ``email`` ``invalid``
         *     (``field.identifier_ambiguous``). ``validated_data["identifier"]`` is the one given (an address holds
         *     ``@``, a phone never does).
         */
        VerifyCodeRequest: {
            code: string;
            email?: string | null;
            phone?: string | null;
            purpose: components["schemas"]["OtpPurposeEnum"];
        };
        /**
         * @description ``POST staff/`` body: ``email`` (trimmed, lower-cased, unique), ``full_name`` (trimmed 2..150),
         *     ``is_manager`` (default ``false``), ``delivery`` (default ``temporary_password``), ``language`` (the
         *     person's panel and e-mail language, default ``uz``).
         */
        WorkforceInviteRequest: {
            /**
             * @description `temporary_password` (shown once in the answer), `email_link` (a single-use link to the account's e-mail; no usable password until it is used) or `both`. The e-mail options need `Me.capabilities.staff_email_invite` (else `invalid_choice`).
             *
             *     * `temporary_password` - temporary_password
             *     * `email_link` - email_link
             *     * `both` - both
             * @default temporary_password
             */
            delivery: components["schemas"]["StaffPasswordDeliveryEnum"];
            /** Format: email */
            email: string;
            full_name: string;
            /** @default uz */
            language: components["schemas"]["ContentLanguageEnum"];
        };
        WorkingDay: {
            /** Format: time */
            break_end: string | null;
            /** Format: time */
            break_start: string | null;
            /** Format: time */
            end: string;
            location_id: number;
            /** Format: time */
            start: string;
            weekday: number;
        };
        WorkingDayInputRequest: {
            /**
             * Format: time
             * @description "HH:MM", Tashkent, minutes a multiple of 5.
             */
            break_end?: string | null;
            /**
             * Format: time
             * @description "HH:MM", Tashkent, minutes a multiple of 5.
             */
            break_start?: string | null;
            /**
             * Format: time
             * @description "HH:MM", Tashkent, minutes a multiple of 5.
             */
            end: string;
            location_id: number;
            /**
             * Format: time
             * @description "HH:MM", Tashkent, minutes a multiple of 5.
             */
            start: string;
            /** @description 0 = Monday … 6 = Sunday. */
            weekday: number;
        };
        WorkingHours: {
            end: string;
            start: string;
        };
        /**
         * @description Body of ``PUT specialists/{id}/working-hours/``: the working weekdays (a weekday left out is a day
         *     off every week).
         */
        WorkingWeekRequest: {
            days: components["schemas"]["WorkingDayInputRequest"][];
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    admin_appointments_day: {
        parameters: {
            query?: {
                date?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DaySchedule"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_appointments_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AppointmentCreateRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AppointmentItem"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_appointments_action: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                action: "attend" | "confirm" | "reject";
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AppointmentItem"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_appointments_cancel: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["AppointmentCancelRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AppointmentItem"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_appointments_reschedule: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AppointmentRescheduleRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AppointmentItem"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_appointments_meta: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AppointmentsMeta"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_appointments_pending_summary: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PendingSummary"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_appointments_range: {
        parameters: {
            query: {
                /**
                 * @description * `counts` - counts
                 *     * `full` - full
                 */
                detail?: "counts" | "full";
                from: string;
                specialist_id?: number;
                to: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AppointmentRange"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_assistant_jobs_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AssistantJob"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_assistant_jobs_accept_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AssistantAcceptRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AssistantAcceptResult"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_assistant_jobs_apply_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AssistantApplyRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AssistantApplyResult"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_assistant_jobs_discard_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AssistantJob"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_assistant_status_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AssistantStatus"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_audit_log_list: {
        parameters: {
            query?: {
                action?: string;
                actor?: number;
                date_from?: string;
                date_to?: string;
                /** @description Download the filtered list as a file instead of the JSON page. */
                export?: "csv" | "xlsx";
                object_id?: string;
                object_type?: string;
                /**
                 * @description * `-at` - -at
                 *     * `at` - at
                 */
                ordering?: "-at" | "at";
                page?: number;
                page_size?: 20 | 50;
                /** @description The start of a request id (8–64 characters `A-Z a-z 0-9 -`): entries whose stored request id begins with it. */
                request_id?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedAuditEntryList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_audit_log_facets: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuditFacets"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_auth_change_password: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ChangePasswordRequest"];
            };
        };
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_auth_login: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminLoginResult"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_auth_logout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LogoutRequest"];
            };
        };
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_auth_me: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Me"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_auth_me_update: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedMeUpdateRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Me"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_auth_mfa_status: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MfaStatus"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_auth_mfa_confirm: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MfaConfirmRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MfaRecoveryCodes"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_auth_mfa_disable: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MfaDisableRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MfaStatus"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_auth_mfa_recovery_codes: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MfaRegenerateRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MfaRecoveryCodes"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_auth_mfa_setup: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MfaPasswordRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MfaSetup"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_auth_mfa_verify: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MfaVerifyRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LoginResponse"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_auth_oauth_login: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                provider: "facebook" | "google";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OAuthCallbackRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminLoginResult"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_auth_oauth_unlink: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                provider: "facebook" | "google";
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_auth_oauth_link: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                provider: "facebook" | "google";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OAuthCallbackRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Me"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_auth_password_link: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OwnPasswordLink"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_auth_password_token_check: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PasswordTokenRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PasswordTokenInfo"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_auth_password_token_set: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PasswordTokenSetRequest"];
            };
        };
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_auth_refresh: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RefreshRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Access"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_banners_list: {
        parameters: {
            query?: {
                /** @description Download the filtered list as a file instead of the JSON page. */
                export?: "csv" | "xlsx";
                is_active?: boolean;
                page?: number;
                page_size?: 20 | 50;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedBannerList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_banners_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["BannerFormRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Banner"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_banners_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Banner"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_banners_destroy: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_banners_partial_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedBannerPatchRequest"];
                "multipart/form-data": components["schemas"]["PatchedBannerPatchFormRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Banner"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_banners_reorder: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["IdOrderRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BannerResults"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_cashback_policy_versions_create: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PolicyVersionCreateRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PolicyVersionCreated"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_cashback_policy_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CashbackPolicy"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_categories_list: {
        parameters: {
            query?: {
                /** @description Download the filtered list as a file instead of the JSON page. */
                export?: "csv" | "xlsx";
                is_active?: boolean;
                page?: number;
                page_size?: 20 | 50;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedCategoryList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_categories_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CategoryWriteRequest"];
                "multipart/form-data": components["schemas"]["CategoryFormRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Category"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_categories_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Category"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_categories_destroy: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_categories_partial_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slug: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedCategoryPatchRequest"];
                "multipart/form-data": components["schemas"]["PatchedCategoryPatchFormRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Category"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_categories_reorder: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SlugOrderRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CategoryResults"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_clinics_list: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClinicLocations"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_clinics_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ClinicLocationCreateRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClinicLocation"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_clinics_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClinicLocation"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_clinics_partial_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedClinicLocationPatchRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClinicLocation"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_customers_list: {
        parameters: {
            query?: {
                /** @description Download the filtered list as a file instead of the JSON page. */
                export?: "csv" | "xlsx";
                /**
                 * @description * `-registered_at` - -registered_at
                 *     * `registered_at` - registered_at
                 *     * `name` - name
                 *     * `-name` - -name
                 *     * `lifetime_total` - lifetime_total
                 *     * `-lifetime_total` - -lifetime_total
                 *     * `balance` - balance
                 *     * `-balance` - -balance
                 */
                ordering?: "-registered_at" | "registered_at" | "name" | "-name" | "lifetime_total" | "-lifetime_total" | "balance" | "-balance";
                page?: number;
                page_size?: 20 | 50;
                search?: string;
                segment?: number;
                /**
                 * @description * `active` - active
                 *     * `deleted` - deleted
                 */
                status?: "active" | "deleted";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedCustomerListItemList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_customers_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerCard"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_customers_cashback_adjustments_create: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CashbackAdjustmentRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CashbackAdjustmentResult"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_customers_sessions_list: {
        parameters: {
            query?: {
                page?: number;
                page_size?: 20 | 50;
            };
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedAdminCustomerSessionList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_customers_sessions_destroy: {
        parameters: {
            query?: never;
            header?: {
                /** @description Optional client-generated UUID; when sent, a retry with the same body returns the stored 2xx response with `Idempotent-Replayed: true` and another body answers 422 `idempotency_key_reused`. */
                "Idempotency-Key"?: string;
            };
            path: {
                id: number;
                session_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_dashboard: {
        parameters: {
            query?: {
                from?: string;
                /**
                 * @description * `today` - today
                 *     * `week` - week
                 *     * `month` - month
                 *     * `custom` - custom
                 */
                range?: "today" | "week" | "month" | "custom";
                to?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Dashboard"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_delivery_issues_list: {
        parameters: {
            query?: {
                /**
                 * @description * `dispatch_failed` - dispatch_failed
                 *     * `dispatch_unknown` - dispatch_unknown
                 *     * `dispatch_review` - dispatch_review
                 *     * `delivery_failed` - delivery_failed
                 *     * `return_pending` - return_pending
                 *     * `preparation_overdue` - preparation_overdue
                 *     * `cancel_incomplete` - cancel_incomplete
                 *     * `parcel_unaccounted` - parcel_unaccounted
                 *     * `incident` - incident
                 */
                kind?: "dispatch_failed" | "dispatch_unknown" | "dispatch_review" | "delivery_failed" | "return_pending" | "preparation_overdue" | "cancel_incomplete" | "parcel_unaccounted" | "incident";
                order?: number;
                page?: number;
                page_size?: 20 | 50;
                /**
                 * @description * `open` - open
                 *     * `resolved` - resolved
                 */
                state?: "open" | "resolved";
                urgent?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedDeliveryIssueList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_delivery_issues_resolve: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ResolveIssueRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeliveryIssue"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_delivery_suspension_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Suspension"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_delivery_suspension_update: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SuspensionBodyRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Suspension"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_billz_import_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["BillzImportRequest"];
            };
        };
        responses: {
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Job"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_jobs_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Job"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_nav_counts: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NavCounts"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_notification_templates_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                status: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StatusTemplate"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_notification_templates_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                status: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TemplateUpdateRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StatusTemplate"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_notifications_list: {
        parameters: {
            query?: {
                /** @description Download the filtered list as a file instead of the JSON page. */
                export?: "csv" | "xlsx";
                /**
                 * @description * `promo` - promo
                 *     * `general` - general
                 */
                kind?: "promo" | "general";
                page?: number;
                page_size?: 20 | 50;
                /**
                 * @description * `draft` - draft
                 *     * `tested` - tested
                 *     * `scheduled` - scheduled
                 *     * `sending` - sending
                 *     * `stopping` - stopping
                 *     * `sent` - sent
                 *     * `partially_sent` - partially_sent
                 *     * `cancelled` - cancelled
                 *     * `failed` - failed
                 */
                state?: "draft" | "tested" | "scheduled" | "sending" | "stopping" | "sent" | "partially_sent" | "cancelled" | "failed";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedNotificationRecordList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_notifications_create: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["NotificationFormRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotificationRecord"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_notifications_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotificationRecord"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_notifications_destroy: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_notifications_partial_update: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "multipart/form-data": components["schemas"]["PatchedNotificationPatchFormRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotificationRecord"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_notifications_approve: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ApproveInputRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotificationRecord"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_notifications_cancel: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotificationRecord"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_notifications_return_to_draft: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotificationRecord"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_notifications_stop: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotificationRecord"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_notifications_test: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SendTestInputRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotificationRecord"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_notifications_test_confirm: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
                test_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotificationRecord"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_notifications_meta: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotificationMeta"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_notification_test_devices_list: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TestDevice"][];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_notification_test_devices_create: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TestDeviceCreateRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TestDevice"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_notification_test_devices_destroy: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_orders_list: {
        parameters: {
            query?: {
                /**
                 * @description `open`: the order has an open delivery issue; `urgent`: an open urgent one.
                 *
                 *     * `open` - open
                 *     * `urgent` - urgent
                 */
                attention?: "open" | "urgent";
                customer?: number;
                date_from?: string;
                date_to?: string;
                /** @description Download the filtered list as a file instead of the JSON page. */
                export?: "csv" | "xlsx";
                /**
                 * @description * `delivery` - delivery
                 *     * `pickup` - pickup
                 */
                fulfilment?: "delivery" | "pickup";
                /**
                 * @description * `-created_at` - -created_at
                 *     * `created_at` - created_at
                 */
                ordering?: "-created_at" | "created_at";
                page?: number;
                page_size?: 6 | 10 | 25 | 50;
                /**
                 * @description * `pending` - pending
                 *     * `paid` - paid
                 *     * `failed` - failed
                 *     * `refunded` - refunded
                 */
                payment?: "pending" | "paid" | "failed" | "refunded";
                /**
                 * @description * `today` - today
                 *     * `week` - week
                 *     * `month` - month
                 *     * `all` - all
                 */
                period?: "today" | "week" | "month" | "all";
                /**
                 * @description The shipment's carrier.
                 *
                 *     * `bts` - bts
                 *     * `yandex` - yandex
                 */
                provider?: "bts" | "yandex";
                search?: string;
                /**
                 * @description A Yandex shipment's stage.
                 *
                 *     * `awaiting_dispatch` - awaiting_dispatch
                 *     * `courier_requested` - courier_requested
                 *     * `courier_assigned` - courier_assigned
                 *     * `courier_arrived` - courier_arrived
                 *     * `in_transit` - in_transit
                 *     * `at_destination` - at_destination
                 *     * `delivered` - delivered
                 *     * `returning` - returning
                 *     * `returned` - returned
                 *     * `cancelled` - cancelled
                 *     * `failed` - failed
                 */
                stage?: "awaiting_dispatch" | "courier_requested" | "courier_assigned" | "courier_arrived" | "in_transit" | "at_destination" | "delivered" | "returning" | "returned" | "cancelled" | "failed";
                /**
                 * @description * `awaiting_payment` - awaiting_payment
                 *     * `processing` - processing
                 *     * `handed_to_courier` - handed_to_courier
                 *     * `delivered` - delivered
                 *     * `cancelled` - cancelled
                 */
                status?: "awaiting_payment" | "processing" | "handed_to_courier" | "delivered" | "cancelled";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedOrderSummaryList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_orders_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrderDetail"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_orders_cancel: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CancelOrderRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrderDetail"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_orders_confirm_return: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["ConfirmReturnRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrderDetail"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_orders_dispatch: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DispatchRequest"];
            };
        };
        responses: {
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrderDetail"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_orders_issues_create: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OpenIssueRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeliveryIssue"];
                };
            };
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeliveryIssue"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_orders_retry_shipment: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrderDetail"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_orders_transition: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TransitionRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrderDetail"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_orders_status_counts: {
        parameters: {
            query?: {
                /**
                 * @description `open`: the order has an open delivery issue; `urgent`: an open urgent one.
                 *
                 *     * `open` - open
                 *     * `urgent` - urgent
                 */
                attention?: "open" | "urgent";
                customer?: number;
                date_from?: string;
                date_to?: string;
                /**
                 * @description * `delivery` - delivery
                 *     * `pickup` - pickup
                 */
                fulfilment?: "delivery" | "pickup";
                /**
                 * @description * `pending` - pending
                 *     * `paid` - paid
                 *     * `failed` - failed
                 *     * `refunded` - refunded
                 */
                payment?: "pending" | "paid" | "failed" | "refunded";
                /**
                 * @description * `today` - today
                 *     * `week` - week
                 *     * `month` - month
                 *     * `all` - all
                 */
                period?: "today" | "week" | "month" | "all";
                /**
                 * @description The shipment's carrier.
                 *
                 *     * `bts` - bts
                 *     * `yandex` - yandex
                 */
                provider?: "bts" | "yandex";
                search?: string;
                /**
                 * @description A Yandex shipment's stage.
                 *
                 *     * `awaiting_dispatch` - awaiting_dispatch
                 *     * `courier_requested` - courier_requested
                 *     * `courier_assigned` - courier_assigned
                 *     * `courier_arrived` - courier_arrived
                 *     * `in_transit` - in_transit
                 *     * `at_destination` - at_destination
                 *     * `delivered` - delivered
                 *     * `returning` - returning
                 *     * `returned` - returned
                 *     * `cancelled` - cancelled
                 *     * `failed` - failed
                 */
                stage?: "awaiting_dispatch" | "courier_requested" | "courier_assigned" | "courier_arrived" | "in_transit" | "at_destination" | "delivered" | "returning" | "returned" | "cancelled" | "failed";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StatusCounts"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_payments_list: {
        parameters: {
            query?: {
                date_from?: string;
                date_to?: string;
                /** @description Download the filtered list as a file instead of the JSON page. */
                export?: "csv" | "xlsx";
                /**
                 * @description * `-created_at` - -created_at
                 *     * `created_at` - created_at
                 */
                ordering?: "-created_at" | "created_at";
                page?: number;
                page_size?: 20 | 50;
                /**
                 * @description * `today` - today
                 *     * `week` - week
                 *     * `month` - month
                 *     * `all` - all
                 */
                period?: "today" | "week" | "month" | "all";
                /**
                 * @description * `click` - click
                 *     * `payme` - payme
                 *     * `uzum` - uzum
                 */
                provider?: "click" | "payme" | "uzum";
                /**
                 * @description * `requested` - requested
                 *     * `submitting` - submitting
                 *     * `succeeded` - succeeded
                 *     * `failed` - failed
                 *     * `manual_required` - manual_required
                 *     * `unknown` - unknown
                 */
                refund_state?: "requested" | "submitting" | "succeeded" | "failed" | "manual_required" | "unknown";
                search?: string;
                /**
                 * @description * `pending` - pending
                 *     * `paid` - paid
                 *     * `failed` - failed
                 *     * `refunded` - refunded
                 */
                status?: "pending" | "paid" | "failed" | "refunded";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedPaymentList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_payments_refund_resolve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
                refund_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ResolveRefundRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Payment"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_payments_refund_retry: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
                refund_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Payment"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_products_list: {
        parameters: {
            query?: {
                /** @description A category slug, or `none` for products without a category. */
                category?: string;
                /** @description Download the filtered list as a file instead of the JSON page. */
                export?: "csv" | "xlsx";
                is_new?: boolean;
                /**
                 * @description * `default` - default
                 *     * `name` - name
                 *     * `-name` - -name
                 */
                ordering?: "default" | "name" | "-name";
                out_of_stock?: boolean;
                page?: number;
                page_size?: 8;
                promo?: boolean;
                search?: string;
                /**
                 * @description * `active` - active
                 *     * `hidden` - hidden
                 */
                status?: "active" | "hidden";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedProductList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_products_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProductWriteRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Product"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_products_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Product"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_products_partial_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedProductPatchRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Product"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_product_images_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["ProductImageUploadRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProductImage"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_product_images_destroy: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
                image_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_product_images_partial_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
                image_id: number;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedImagePatchRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProductImage"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_product_images_reorder: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ImageOrderRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ImagesResponse"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_assistant_jobs_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                product_id: number;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["AssistantJobCreateRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AssistantStart"];
                };
            };
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AssistantStart"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_products_stats: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProductStats"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_segments_list: {
        parameters: {
            query?: {
                /** @description Download the filtered list as a file instead of the JSON page. */
                export?: "csv" | "xlsx";
                page?: number;
                page_size?: 20 | 50;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedSegmentList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_segments_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SegmentWriteRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Segment"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_segments_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Segment"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_segments_destroy: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_segments_partial_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedSegmentWriteRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Segment"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_segment_members_list: {
        parameters: {
            query?: {
                /** @description Download the filtered list as a file instead of the JSON page. */
                export?: "csv" | "xlsx";
                page?: number;
                page_size?: 20 | 50;
            };
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedCustomerListItemList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_segment_members_add: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["SegmentMembersInputRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Segment"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_segment_members_remove: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                customer_id: number;
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    specialist_appointments_day: {
        parameters: {
            query?: {
                date?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SpecialistAppointmentDay"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    specialist_appointments_create: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SpecialistAppointmentCreateRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SpecialistAppointmentItem"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    specialist_appointments_action: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                action: "attend" | "confirm" | "reject";
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SpecialistAppointmentItem"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    specialist_appointments_cancel: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["AppointmentCancelRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SpecialistAppointmentItem"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    specialist_appointments_reschedule: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SpecialistRescheduleRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SpecialistAppointmentItem"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    specialist_appointments_meta: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AppointmentsMeta"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    specialist_appointments_pending_summary: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PendingSummary"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    specialist_appointments_range: {
        parameters: {
            query: {
                /**
                 * @description * `counts` - counts
                 *     * `full` - full
                 */
                detail?: "counts" | "full";
                from: string;
                to: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SpecialistAppointmentRange"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    specialist_availability: {
        parameters: {
            query?: {
                date_from?: string;
                date_to?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SpecialistAvailability"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    specialist_block_create: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BlockedPeriodCreateRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BlockedPeriod"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    specialist_block_update: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BlockedPeriodCreateRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BlockedPeriod"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    specialist_block_delete: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    specialist_conflicts: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SpecialistConflicts"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    specialist_override_create: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["HoursOverrideCreateRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HoursOverride"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    specialist_override_update: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["HoursOverrideCreateRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HoursOverride"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    specialist_override_delete: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    specialist_profile: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SpecialistOwnProfile"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    specialist_profile_update: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedOwnProfileRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SpecialistOwnProfile"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    specialist_profile_photo_update: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["OwnPhotoUploadRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SpecialistOwnProfile"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    specialist_profile_photo_destroy: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    specialist_services_create: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ClinicServiceWriteRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SpecialistOwnProfile"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    specialist_services_destroy: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    specialist_services_partial_update: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedClinicServiceWriteRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SpecialistOwnProfile"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    specialist_weekly_hours_update: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WorkingWeekRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SpecialistOwnProfile"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_specialists_list: {
        parameters: {
            query?: {
                /** @description Download the filtered list as a file instead of the JSON page. */
                export?: "csv" | "xlsx";
                is_active?: boolean;
                /**
                 * @description * `position` - position
                 *     * `name` - name
                 *     * `-name` - -name
                 *     * `created_at` - created_at
                 *     * `-created_at` - -created_at
                 */
                ordering?: "position" | "name" | "-name" | "created_at" | "-created_at";
                page?: number;
                page_size?: 20 | 50;
                /**
                 * @description * `dermatologist` - dermatologist
                 *     * `cosmetologist` - cosmetologist
                 */
                role?: "dermatologist" | "cosmetologist";
                search?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedClinicSpecialistList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_specialists_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClinicSpecialist"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_specialists_partial_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedClinicSpecialistPatchRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClinicSpecialist"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_specialists_blocks_list: {
        parameters: {
            query?: {
                date_from?: string;
                date_to?: string;
                page?: number;
                page_size?: 20 | 50;
            };
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedBlockedPeriodList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_specialists_blocks_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BlockedPeriodCreateRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BlockedPeriod"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_specialists_blocks_destroy: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                block_id: number;
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_specialists_conflicts: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ScheduleConflicts"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_specialists_overrides_list: {
        parameters: {
            query?: {
                date_from?: string;
                date_to?: string;
                page?: number;
                page_size?: 20 | 50;
            };
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedHoursOverrideList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_specialists_overrides_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["HoursOverrideCreateRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HoursOverride"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_specialists_overrides_destroy: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
                override_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_specialists_photo_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["SpecialistPhotoUploadRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClinicSpecialist"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_specialists_photo_destroy: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_specialists_services_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ClinicServiceWriteRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClinicSpecialist"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_specialists_services_destroy: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
                service_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_specialists_services_partial_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
                service_id: number;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedClinicServiceWriteRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClinicSpecialist"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_specialists_working_hours_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WorkingWeekRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClinicSpecialist"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_specialist_invite: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WorkforceInviteRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SpecialistInviteCredentials"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_staff_list: {
        parameters: {
            query?: {
                is_active?: boolean;
                page?: number;
                page_size?: 20 | 50 | 100;
                search?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedStaffListItemList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_staff_create: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StaffCreateRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffCredentials"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_staff_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffMember"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_staff_partial_update: {
        parameters: {
            query?: never;
            header?: {
                /** @description Optional client-generated UUID; when sent, a retry with the same body returns the stored 2xx response with `Idempotent-Replayed: true` and another body answers 422 `idempotency_key_reused`. */
                "Idempotency-Key"?: string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedStaffUpdateRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffMember"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_staff_deactivate: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffMember"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_staff_reactivate: {
        parameters: {
            query?: never;
            header?: {
                /** @description Optional client-generated UUID; when sent, a retry with the same body returns the stored 2xx response with `Idempotent-Replayed: true` and another body answers 422 `idempotency_key_reused`. */
                "Idempotency-Key"?: string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffMember"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_staff_reset_mfa: {
        parameters: {
            query?: never;
            header?: {
                /** @description Optional client-generated UUID; when sent, a retry with the same body returns the stored 2xx response with `Idempotent-Replayed: true` and another body answers 422 `idempotency_key_reused`. */
                "Idempotency-Key"?: string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["StaffResetMfaRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffMember"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_staff_reset_password: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["StaffResetPasswordRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffCredentials"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_staff_send_password_link: {
        parameters: {
            query?: never;
            header?: {
                /** @description Optional client-generated UUID; when sent, a retry with the same body returns the stored 2xx response with `Idempotent-Replayed: true` and another body answers 422 `idempotency_key_reused`. */
                "Idempotency-Key"?: string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffLinkSent"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    admin_staff_specialist_role: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SpecialistRoleChangeRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SpecialistRoleChangeResult"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    customer_appointments_create: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BookingRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerAppointment"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_appointments_cancel: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["CancelRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerAppointment"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_auth_login: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description The device key issued once in `AuthTokens.device_key`; proves a known device (§1.9). */
                "X-GD-Device-Key"?: string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CustomerLoginRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthTokensOrNextStep"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_auth_logout: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CustomerLogoutRequest"];
            };
        };
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_auth_refresh: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CustomerRefreshRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RefreshResponse"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_auth_reset_password: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ResetPasswordRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthTokens"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_auth_send_code: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SendCodeRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CodeIssue"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_auth_set_password: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SetPasswordRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthTokens"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_auth_social: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SocialRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthTokensOrNextStep"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_auth_social_complete: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SocialCompleteRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthTokens"];
                };
            };
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthTokens"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_auth_social_nonce: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Nonce"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_auth_verify_code: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VerifyCodeRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Verification"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_cart_retrieve: {
        parameters: {
            query?: never;
            header: {
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerCart"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_cart_clear: {
        parameters: {
            query?: never;
            header: {
                /** @description Optional client-generated UUID; when sent, a retry with the same body returns the stored 2xx response with `Idempotent-Replayed: true` and another body answers 422 `idempotency_key_reused`. */
                "Idempotency-Key"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerCart"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_cart_items_create: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CustomerCartAddRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerCart"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_cart_items_bulk_delete: {
        parameters: {
            query: {
                /** @description 1..50 product ids (repeat the parameter). */
                product_id: number[];
            };
            header: {
                /** @description Optional client-generated UUID; when sent, a retry with the same body returns the stored 2xx response with `Idempotent-Replayed: true` and another body answers 422 `idempotency_key_reused`. */
                "Idempotency-Key"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerCart"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_cart_items_destroy: {
        parameters: {
            query?: never;
            header: {
                /** @description Optional client-generated UUID; when sent, a retry with the same body returns the stored 2xx response with `Idempotent-Replayed: true` and another body answers 422 `idempotency_key_reused`. */
                "Idempotency-Key"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path: {
                product_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerCart"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_cart_items_update: {
        parameters: {
            query?: never;
            header: {
                /** @description Optional client-generated UUID; when sent, a retry with the same body returns the stored 2xx response with `Idempotent-Replayed: true` and another body answers 422 `idempotency_key_reused`. */
                "Idempotency-Key"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path: {
                product_id: number;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedCustomerCartQuantityRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerCart"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_catalog_banners_list: {
        parameters: {
            query?: never;
            header?: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id"?: string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform"?: "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerBannerList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_catalog_categories_list: {
        parameters: {
            query?: never;
            header?: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id"?: string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform"?: "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerCategoryList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_catalog_products_list: {
        parameters: {
            query?: {
                category?: string;
                in_stock?: boolean;
                /**
                 * @description * `default` - default
                 *     * `price` - price
                 *     * `-price` - -price
                 *     * `name` - name
                 */
                ordering?: "default" | "price" | "-price" | "name";
                page?: number;
                page_size?: 20 | 50;
                promo?: boolean;
                search?: string;
            };
            header?: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id"?: string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform"?: "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedProductCardList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_catalog_products_retrieve: {
        parameters: {
            query?: never;
            header?: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id"?: string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform"?: "android" | "ios" | "web";
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProductDetail"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_catalog_products_by_slug_retrieve: {
        parameters: {
            query?: never;
            header?: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id"?: string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform"?: "android" | "ios" | "web";
            };
            path: {
                slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProductDetail"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_delivery_calculate: {
        parameters: {
            query?: never;
            header: {
                /** @description Optional client-generated UUID; when sent, a retry with the same body returns the stored 2xx response with `Idempotent-Replayed: true` and another body answers 422 `idempotency_key_reused`. */
                "Idempotency-Key"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CustomerDeliveryCalculateRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerDeliveryQuote"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_delivery_regions: {
        parameters: {
            query?: never;
            header?: {
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id"?: string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform"?: "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RegionCatalog"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    health_retrieve: {
        parameters: {
            query?: {
                ready?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Health"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Health"];
                };
            };
        };
    };
    customer_me_retrieve: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerMe"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_me_destroy: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description Optional client-generated UUID; when sent, a retry with the same body returns the stored 2xx response with `Idempotent-Replayed: true` and another body answers 422 `idempotency_key_reused`. */
                "Idempotency-Key"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReauthRequest"];
            };
        };
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_me_partial_update: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description Optional client-generated UUID; when sent, a retry with the same body returns the stored 2xx response with `Idempotent-Replayed: true` and another body answers 422 `idempotency_key_reused`. */
                "Idempotency-Key"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedMePatchRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerMe"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_me_addresses_list: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerAddressList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_me_addresses_create: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AddressWriteRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerAddress"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_me_addresses_destroy: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description Optional client-generated UUID; when sent, a retry with the same body returns the stored 2xx response with `Idempotent-Replayed: true` and another body answers 422 `idempotency_key_reused`. */
                "Idempotency-Key"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_me_addresses_partial_update: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description Optional client-generated UUID; when sent, a retry with the same body returns the stored 2xx response with `Idempotent-Replayed: true` and another body answers 422 `idempotency_key_reused`. */
                "Idempotency-Key"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedAddressWriteRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerAddress"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_me_addresses_default: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description Optional client-generated UUID; when sent, a retry with the same body returns the stored 2xx response with `Idempotent-Replayed: true` and another body answers 422 `idempotency_key_reused`. */
                "Idempotency-Key"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerAddress"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_my_appointments_list: {
        parameters: {
            query?: {
                page?: number;
                page_size?: 20 | 50;
                scope?: "past" | "upcoming";
            };
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedCustomerAppointmentList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_my_appointments_retrieve: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerAppointment"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_cashback_retrieve: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CashbackSummary"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_cashback_ledger_list: {
        parameters: {
            query?: {
                page?: number;
                page_size?: 20 | 50;
            };
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedLedgerItemList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_me_consent: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description Optional client-generated UUID; when sent, a retry with the same body returns the stored 2xx response with `Idempotent-Replayed: true` and another body answers 422 `idempotency_key_reused`. */
                "Idempotency-Key"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConsentRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerMe"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_me_device_update: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description Optional client-generated UUID; when sent, a retry with the same body returns the stored 2xx response with `Idempotent-Replayed: true` and another body answers 422 `idempotency_key_reused`. */
                "Idempotency-Key"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DeviceRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeviceState"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_me_email_attach: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MeEmailRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerMe"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_me_email_code: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MeEmailCodeRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CodeIssue"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_me_image_update: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description Optional client-generated UUID; when sent, a retry with the same body returns the stored 2xx response with `Idempotent-Replayed: true` and another body answers 422 `idempotency_key_reused`. */
                "Idempotency-Key"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "multipart/form-data": {
                    /** Format: binary */
                    file?: string;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ImageUrl"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_me_image_destroy: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description Optional client-generated UUID; when sent, a retry with the same body returns the stored 2xx response with `Idempotent-Replayed: true` and another body answers 422 `idempotency_key_reused`. */
                "Idempotency-Key"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_notifications_list: {
        parameters: {
            query?: {
                page?: number;
                page_size?: 20 | 50;
            };
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedInboxItemList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_notifications_read: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description Optional client-generated UUID; when sent, a retry with the same body returns the stored 2xx response with `Idempotent-Replayed: true` and another body answers 422 `idempotency_key_reused`. */
                "Idempotency-Key"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Read"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_notifications_ack: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description Optional client-generated UUID; when sent, a retry with the same body returns the stored 2xx response with `Idempotent-Replayed: true` and another body answers 422 `idempotency_key_reused`. */
                "Idempotency-Key"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AckRequestRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Ack"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_notifications_read_all: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description Optional client-generated UUID; when sent, a retry with the same body returns the stored 2xx response with `Idempotent-Replayed: true` and another body answers 422 `idempotency_key_reused`. */
                "Idempotency-Key"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReadAll"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_notifications_unread_count: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UnreadCount"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_orders_list: {
        parameters: {
            query?: {
                page?: number;
                page_size?: 10 | 20;
                /**
                 * @description * `active` - active
                 *     * `completed` - completed
                 *     * `cancelled` - cancelled
                 *     * `all` - all
                 */
                scope?: "active" | "completed" | "cancelled" | "all";
            };
            header: {
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedCustomerOrderSummaryList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_orders_retrieve: {
        parameters: {
            query?: never;
            header: {
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerOrderDetail"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_me_password: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MePasswordRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerMe"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_me_phone_attach: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MePhoneRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerMe"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_me_phone_code: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MePhoneCodeRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CodeIssue"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_qr_retrieve: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QrToken"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_sessions_list: {
        parameters: {
            query?: {
                page?: number;
                page_size?: 20 | 50;
            };
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedCustomerSessionList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_sessions_destroy: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description Optional client-generated UUID; when sent, a retry with the same body returns the stored 2xx response with `Idempotent-Replayed: true` and another body answers 422 `idempotency_key_reused`. */
                "Idempotency-Key"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_sessions_revoke_others: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description Optional client-generated UUID; when sent, a retry with the same body returns the stored 2xx response with `Idempotent-Replayed: true` and another body answers 422 `idempotency_key_reused`. */
                "Idempotency-Key"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RevokedSessions"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_me_social_link: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MeSocialLinkRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerMe"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_me_social_unlink: {
        parameters: {
            query?: never;
            header: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description Optional client-generated UUID; when sent, a retry with the same body returns the stored 2xx response with `Idempotent-Replayed: true` and another body answers 422 `idempotency_key_reused`. */
                "Idempotency-Key"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path: {
                provider: "apple" | "facebook" | "google";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReauthRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerMe"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_orders_cancel: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerOrderDetail"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_orders_pay: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["CustomerPayRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerPayLink"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_orders_reorder: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["CustomerReorderRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerCart"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_orders_checkout: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id": string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform": "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CustomerCheckoutRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerOrderDetail"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    pos_cashback_resolve_qr: {
        parameters: {
            query?: never;
            header?: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ResolveQrRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResolvedQr"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_services_list: {
        parameters: {
            query?: never;
            header?: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id"?: string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform"?: "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ServiceList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_settings_public_retrieve: {
        parameters: {
            query?: never;
            header?: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id"?: string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform"?: "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicSettings"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_specialists_list: {
        parameters: {
            query?: never;
            header?: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id"?: string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform"?: "android" | "ios" | "web";
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SpecialistList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_specialists_retrieve: {
        parameters: {
            query?: never;
            header?: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id"?: string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform"?: "android" | "ios" | "web";
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Specialist"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_specialist_slots_list: {
        parameters: {
            query: {
                /** @description YYYY-MM-DD */
                date: string;
                location_id: number;
                service_id: number;
            };
            header?: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id"?: string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform"?: "android" | "ios" | "web";
            };
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FreeSlots"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    customer_specialists_by_slug_retrieve: {
        parameters: {
            query?: never;
            header?: {
                /** @description First supported tag among uz, ru, en in q-order; else the customer's language, else uz. */
                "Accept-Language"?: string;
                /** @description App version, required with `ios`/`android` (below the platform's minimum → 426 `app_update_required`); optional for `web`, where no minimum applies. */
                "X-GD-App-Version"?: string;
                /** @description Firebase installation id of this app install (an identifier, not a secret). */
                "X-GD-Device-Id"?: string;
                /** @description Device platform (`OrderChannel` literals); `web` = the website's server-side BFF. */
                "X-GD-Platform"?: "android" | "ios" | "web";
            };
            path: {
                slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Specialist"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            426: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerErrorEnvelope"];
                };
            };
        };
    };
    webhook_bts_status: {
        parameters: {
            query?: {
                token?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": {
                    [key: string]: unknown;
                };
                "application/x-www-form-urlencoded": {
                    [key: string]: unknown;
                };
                "multipart/form-data": {
                    [key: string]: unknown;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
        };
    };
    webhook_click_complete: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/x-www-form-urlencoded": {
                    [key: string]: unknown;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
        };
    };
    webhook_click_prepare: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/x-www-form-urlencoded": {
                    [key: string]: unknown;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
        };
    };
    webhook_payme_rpc: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": {
                    [key: string]: unknown;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
        };
    };
    webhook_uzum_checkout: {
        parameters: {
            query: {
                token: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
        };
    };
    webhook_yandex_delivery_status: {
        parameters: {
            query: {
                claim_id?: string;
                ref: string;
                updated_ts?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
        };
    };
}
