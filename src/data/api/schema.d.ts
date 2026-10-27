/* eslint-disable */
/**
 * GENERATED FILE — do not edit by hand. Regenerate with `npm run gen:api`.
 *
 * Source: openapi/schema.yaml of the backend repository
 * Commit: 0db5aaa818d1f0529cd9710cfe939b8e0bf5a287
 * Generated: 2026-10-27T23:31:29.409Z (openapi-typescript)
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
        /** @description Move an open (requested|confirmed) appointment; the status is kept. Same slot rules as the creation. A new specialist re-snapshots duration and price from that specialist's service link. */
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
    "/api/v1/admin/audit-log/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["admin_audit_log_list"];
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
        /** @description Staff social sign-in, allow-list only: Django exchanges the authorization code with the provider and signs in the staff member whose identity is already linked. Same response as auth/login/. */
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
        get: operations["admin_banners_retrieve"];
        put?: never;
        post?: never;
        delete: operations["admin_banners_destroy"];
        options?: never;
        head?: never;
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
        get: operations["admin_categories_retrieve"];
        put?: never;
        post?: never;
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
        put: operations["admin_categories_reorder"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
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
    "/api/v1/admin/location/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description The clinic (one location, decision P4); 404 until the first PATCH entered it. */
        get: operations["admin_location_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** @description Texts merge leaf by leaf; the first PATCH creates the clinic and needs `name.uz`. */
        patch: operations["admin_location_partial_update"];
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
        get: operations["admin_notifications_list"];
        put?: never;
        /** @description Multipart with dotted keys (`link.kind`, `audience.type`, …) and an optional `image` (JPEG, PNG or WebP, ≤ 5 MiB). Without `scheduled_at` the send starts at once; the 201 body is the campaign as stored after the commit (`queued`, or `sent` when the send already ran inside the request). With it the campaign waits for its time (state `scheduled`). */
        post: operations["admin_notifications_create"];
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
        /** @description Cancel a `scheduled` campaign before its send starts (state `cancelled`, audited `notification.cancelled`). Idempotent: an already cancelled campaign answers 200 unchanged. 409 `conflict` once the send started (`queued` / `sent`); 404 for an unknown id. */
        post: operations["admin_notifications_cancel"];
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
    "/api/v1/admin/orders/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
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
        post: operations["admin_orders_cancel"];
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
        /** @description Close an `unknown` / `manual_required` refund after a manual check, or a `failed` Click refund as `succeeded` after a fresh Click status check (`manual_payout: true` when Click still reports the payment paid and staff paid the customer by hand; 503 when Click does not answer). Audited `refund.state_changed` with the actor; order event `refund_succeeded` / `refund_failed`. */
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
        /** @description Retry a `failed` refund: a new refund of the payment (Click `requested`, Payme `manual_required`) and its `refund_requested` order event. */
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
        get: operations["admin_products_list"];
        put?: never;
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
        get: operations["admin_products_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
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
        patch?: never;
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
        get: operations["admin_segments_list"];
        put?: never;
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
        get: operations["admin_segments_retrieve"];
        put?: never;
        post?: never;
        delete: operations["admin_segments_destroy"];
        options?: never;
        head?: never;
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
        get: operations["admin_segment_members_list"];
        put?: never;
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
    "/api/v1/admin/services/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["admin_services_list"];
        put?: never;
        post: operations["admin_services_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/services/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["admin_services_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** @description Every field optional; texts merge leaf by leaf. There is no delete: `is_active: false` retires a service (it leaves the customer catalogue at once; its appointments are kept). */
        patch: operations["admin_services_partial_update"];
        trace?: never;
    };
    "/api/v1/admin/settings/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["admin_settings_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** @description Changes the sent fields only (each language of an i18n object separately; keys other than `uz`, `ru`, `en` answer `invalid`). `terms` and `privacy_policy` are drafts: customers keep seeing the published copy until `POST settings/terms/publish/` (`terms_unpublished_changes` tells whether a draft differs from it). The booking policy is not versioned and is served as soon as it is saved. */
        patch: operations["admin_settings_partial_update"];
        trace?: never;
    };
    "/api/v1/admin/settings/terms/publish/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Publishes the terms and privacy drafts (copied into the published texts) as a new `terms_version` (`YYYYMMDD-n`, the Tashkent day and its publication count) and sets `terms_updated_at`. Registration then accepts only the new version and every customer is asked to accept it again at checkout and booking (409 `terms_update_required`). 409 `conflict` while the uz terms or the uz privacy draft has no visible character. Empty body. */
        post: operations["admin_settings_terms_publish"];
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
        get: operations["admin_specialists_list"];
        put?: never;
        /** @description Create a specialist (inactive unless `is_active: true`; the location defaults to the clinic). Add the offered services and the working hours, then activate. */
        post: operations["admin_specialists_create"];
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
        /** @description The exact set of offered services with the price and duration a booking snapshots; a service left out stops being offered. Existing appointments keep their snapshots. */
        put: operations["admin_specialists_services_update"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
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
    "/api/v1/admin/staff/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Every staff member: the directory behind the audit-log actor filter. A manager's rows also carry `full_name`, `is_manager`, `last_login_at`, `linked_providers` and `created_at`; for anyone else these keys are `null`. */
        get: operations["admin_staff_list"];
        put?: never;
        /** @description Manager only (403 `permission_denied` otherwise). Creates an active staff account with a generated temporary password, shown once in the answer. `email` already used by any account → `unique`. */
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
    "/api/v1/admin/staff/{id}/reset-password/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Manager only (403 `permission_denied` otherwise). Replaces the password with a generated temporary one (shown once) and revokes every open session (`password_changed`); linked identities stay. The caller's own account → 409 `conflict` (use `auth/change-password/`). */
        post: operations["admin_staff_reset_password"];
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
        /** @description Attach the phone with its SMS code. Re-authentication (`password`, or a `reset_password` `verification_token` of the account's own e-mail without a password) unless the session signed in within 10 minutes; an account with neither answers `reauth_required` once that window is over. → 200 `Me` with the phone set (checkout, pay, booking and the QR open up). */
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
        /**
         * @description ``POST appointments/`` (T10): ``specialist_id``, ``service_id``, ``customer_id`` | ``phone`` (E.164 of
         *     an active customer), ``start`` (aware, 5-minute grid, inside working hours), ``note`` (≤ 300).
         */
        AppointmentCreateRequest: {
            customer_id?: number;
            note?: string;
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
        AppointmentLocation: {
            readonly address: string;
            readonly name: string;
            readonly phone: string | null;
        };
        /** @description ``POST appointments/{id}/reschedule/``: ``start`` (same slot rules), optional ``specialist_id``. */
        AppointmentRescheduleRequest: {
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
            ip: string | null;
            object_id: string;
            object_type: string;
            request_id: string;
        };
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
        /** @description ``booking_policy`` of a PATCH: each language optional, ≤ 5 000 characters, trimmed. */
        BookingPolicyPatchRequest: {
            en?: string;
            ru?: string;
            uz?: string;
        };
        BookingRequest: {
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
            name: string;
            role: components["schemas"]["SpecialistRoleEnum"];
            services: components["schemas"]["BookingService"][];
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
        /** @description The clinic (decision P4: one location), shown to customers with every specialist. */
        ClinicLocation: {
            readonly address: components["schemas"]["I18nText300"];
            id: number;
            /** Format: double */
            readonly latitude: number | null;
            /** Format: double */
            readonly longitude: number | null;
            readonly name: components["schemas"]["I18nText120"];
            readonly phone: string | null;
            /** Format: date-time */
            updated_at: string;
        };
        /**
         * @description The admin ``ClinicService``; instances come from ``selectors.service_queryset()``
         *     (``specialist_count`` = active specialists offering it through an active link).
         */
        ClinicService: {
            category: components["schemas"]["ServiceCategoryEnum"];
            /** Format: date-time */
            created_at: string;
            default_duration_min: number;
            default_price: number | null;
            readonly description: components["schemas"]["I18nText2000"];
            id: number;
            is_active: boolean;
            readonly name: components["schemas"]["I18nText120"];
            position: number;
            readonly short_name: components["schemas"]["I18nText40"];
            specialist_count: number;
            /** Format: date-time */
            updated_at: string;
        };
        /** @description Body of ``POST services/`` and (``partial``) ``PATCH services/{id}/`` (texts merge leaf by leaf). */
        ClinicServiceWriteRequest: {
            category: components["schemas"]["ServiceCategoryEnum"];
            /** @description Minutes, a multiple of 5 (5 … 480). */
            default_duration_min: number;
            /** @description Suggested price when offering it; null = none. */
            default_price?: number | null;
            description?: components["schemas"]["ServiceDescriptionRequest"];
            /** @default true */
            is_active: boolean;
            name: components["schemas"]["ServiceNameRequest"];
            position?: number;
            short_name?: components["schemas"]["ServiceShortNameRequest"];
        };
        /**
         * @description The admin ``ClinicSpecialist``; instances come from ``selectors.specialist_queryset()``.
         *
         *     ``upcoming_appointments`` (``requested`` / ``confirmed`` appointments starting now or later) comes from
         *     the view's context (``upcoming``), counted once per page.
         */
        ClinicSpecialist: {
            readonly bio: components["schemas"]["I18nText2000"];
            /** Format: date-time */
            created_at: string;
            experience_years: number | null;
            id: number;
            is_active: boolean;
            location_id: number;
            name: string;
            /** Format: uri */
            readonly photo_url: string | null;
            position: number;
            readonly qualifications: components["schemas"]["I18nText2000"];
            role: components["schemas"]["SpecialistRoleEnum"];
            services: components["schemas"]["OfferedService"][];
            slot_step_min: number;
            /** @description The website URL segment (B-W1): unique, editable. */
            slug: string;
            staff_user: components["schemas"]["Actor"] | null;
            readonly upcoming_appointments: number;
            /** Format: date-time */
            updated_at: string;
            working_hours: components["schemas"]["WorkingDay"][];
        };
        /**
         * @description Body of ``POST specialists/`` and (``partial``, see the subclass) ``PATCH specialists/{id}/``.
         *
         *     ``context["professional_id"]`` is the edited specialist (a staff account already linked to it is not a
         *     conflict with itself). The validated data carries ``location`` and ``staff_user`` instances.
         */
        ClinicSpecialistWriteRequest: {
            bio?: components["schemas"]["SpecialistTextRequest"];
            experience_years?: number | null;
            /** @default false */
            is_active: boolean;
            /** @description Default: the clinic (GET location/). */
            location_id?: number;
            name: string;
            position?: number;
            qualifications?: components["schemas"]["SpecialistTextRequest"];
            role: components["schemas"]["SpecialistRoleEnum"];
            /** @description The customer slot grid in minutes: 10, 15, 20, 30 (default) or 60. */
            slot_step_min?: number;
            /** @description Optional on create (derived from the name). */
            slug?: string;
            /** @description An active staff account, or null. */
            staff_user_id?: number | null;
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
            location: components["schemas"]["AppointmentLocation"];
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
            expected_total: number;
            fulfilment: components["schemas"]["FulfilmentMethodEnum"];
            payment_provider: components["schemas"]["PaymentProviderEnum"];
        };
        CustomerDeliveryCalculateRequest: {
            address_id?: number | null;
            cashback_to_use?: number | null;
            city_code?: string | null;
            fulfilment: components["schemas"]["FulfilmentMethodEnum"];
            region_code?: string | null;
        };
        CustomerDeliveryQuote: {
            cashback_max: number;
            cashback_to_use: number;
            city_code: string | null;
            delivery_fee: number;
            expected_total: number;
            fulfilment: components["schemas"]["FulfilmentMethodEnum"];
            items_subtotal: number;
            pickup_address: string | null;
            /** Format: date-time */
            quoted_at: string;
            region_code: string | null;
            weight_g: number | null;
        };
        CustomerDetailItem: {
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
            fulfilment: components["schemas"]["FulfilmentMethodEnum"];
            id: number;
            item_count: number;
            /** Format: date-time */
            pay_by: string | null;
            payment: components["schemas"]["CustomerSummaryPayment"];
            preview_images: string[];
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
            id: number;
            position: number;
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
         * @enum {string}
         */
        EventSourceEnum: "system" | "bts" | "admin";
        FreeSlots: {
            /** Format: date */
            date: string;
            duration_min: number;
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
            /** @description With `integrations`: the live providers configured against a sandbox (BTS test host, Payme sandbox checkout / `PAYME_TEST_MODE`, Eskiz test sender); empty in a real deployment. */
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
        I18nText2000: {
            en: string;
            ru: string;
            uz: string;
        };
        /** @description Contract 1.4: i18n text is {"uz", "ru", "en"}; "" means not filled, never null. */
        I18nText5000: {
            en: string;
            ru: string;
            uz: string;
        };
        /** @description Contract 1.4: i18n text is {"uz", "ru", "en"}; "" means not filled, never null. */
        I18nText50000: {
            en: string;
            ru: string;
            uz: string;
        };
        /** @description Body of ``PUT banners/order/``. */
        IdOrderRequest: {
            ids: number[];
        };
        /** @description Body of ``PUT products/{id}/images/order/``. */
        ImageOrderRequest: {
            image_ids: number[];
        };
        ImagesResponse: {
            images: components["schemas"]["ProductImage"][];
        };
        ImageUrl: {
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
        /**
         * @description Read-only: ``mode`` = ``INTEGRATIONS_MODE`` (the default of every provider), ``providers`` = the
         *     effective mode of each provider.
         */
        Integrations: {
            mode: components["schemas"]["IntegrationModeEnum"];
            providers: components["schemas"]["ProviderModes"];
        };
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
        /** @description ``terms`` / ``privacy_policy`` of a PATCH: each language optional, ≤ 50 000 characters, trimmed. */
        LegalTextPatchRequest: {
            en?: string;
            ru?: string;
            uz?: string;
        };
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
            id: number;
            /** Format: double */
            readonly latitude: number | null;
            /** Format: double */
            readonly longitude: number | null;
            readonly name: string;
            readonly phone: string | null;
        };
        /** @description ``address``: ``{uz, ru, en}``, each ≤ 300, optional. */
        LocationAddressRequest: {
            en?: string;
            ru?: string;
            uz?: string;
        };
        /** @description ``name``: ``uz`` trimmed 2..120 (required by the first PATCH); ``ru`` / ``en`` ≤ 120. */
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
         * @enum {string}
         */
        ManualReasonEnum: "payme" | "no_paydoc" | "fake_mode";
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
            display_name: string;
            /** Format: email */
            email: string;
            id: number;
            /** @description May manage staff (`staff/` writes, §2.16); the UI shows the staff screen only then. */
            is_manager: boolean;
            is_superuser: boolean;
            linked_providers: components["schemas"]["SocialProviderEnum"][];
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
        NavCounts: {
            appointments_pending: number;
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
            link_options: components["schemas"]["LinkOption"][];
            segments: components["schemas"]["MetaSegment"][];
            templates: components["schemas"]["StatusTemplate"][];
            total_devices: number;
        };
        NotificationRecord: {
            readonly audience: components["schemas"]["NotificationAudience"];
            author: components["schemas"]["Actor"] | null;
            body: string;
            /**
             * Format: date-time
             * @description M3: when staff cancelled the scheduled campaign (state `cancelled`).
             */
            cancelled_at: string | null;
            /** Format: date-time */
            created_at: string;
            delivered: number | null;
            failed: number | null;
            id: number;
            readonly image_url: string | null;
            kind: components["schemas"]["NotificationKindEnum"];
            readonly link: components["schemas"]["NotificationLink"];
            recipient_count: number;
            /** Format: date-time */
            scheduled_at: string | null;
            sent: number | null;
            /** Format: date-time */
            sent_at: string | null;
            readonly state: components["schemas"]["NotificationStateEnum"];
            title: string;
        };
        /**
         * @description * `scheduled` - scheduled
         *     * `queued` - queued
         *     * `sent` - sent
         *     * `cancelled` - cancelled
         * @enum {string}
         */
        NotificationStateEnum: "scheduled" | "queued" | "sent" | "cancelled";
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
        /**
         * @description One service the specialist offers: the price and duration a booking snapshots (``is_active`` = the
         *     link; ``service_is_active`` = the service itself; bookable only when both are true).
         */
        OfferedService: {
            category: components["schemas"]["ServiceCategoryEnum"];
            duration_min: number;
            is_active: boolean;
            name: string;
            price: number;
            service_id: number;
            service_is_active: boolean;
            short_name: string;
        };
        OfferedServiceInputRequest: {
            /** @description Minutes, a multiple of 5; omitted or null = the service's default duration. */
            duration_min?: number | null;
            /** @default true */
            is_active: boolean;
            /** @description So'm, 0 … 100 000 000. */
            price: number;
            service_id: number;
        };
        /** @description Body of ``PUT specialists/{id}/services/``: the exact set (``[]`` = offers nothing). */
        OfferedServicesRequest: {
            services: components["schemas"]["OfferedServiceInputRequest"][];
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
         * @enum {string}
         */
        OrderEventTypeEnum: "order_created" | "reservation_created" | "payment_confirmed" | "billz_sale_recorded" | "cashback_credited" | "payment_failed" | "shipment_created" | "shipment_failed" | "status_changed" | "handed_to_courier" | "delivered" | "cancelled" | "reservation_expired" | "refund_requested" | "refund_succeeded" | "refund_failed";
        OrderItem: {
            billz_id: string;
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
        PaginatedClinicServiceList: {
            count: number;
            page: number;
            page_count: number;
            page_size: number;
            results: components["schemas"]["ClinicService"][];
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
        /**
         * @description Body of ``PATCH location/`` (validated with ``partial=True``; texts merge leaf by leaf). The first
         *     PATCH creates the clinic and then needs ``name.uz``; ``latitude`` and ``longitude`` are a pair.
         */
        PatchedClinicLocationPatchRequest: {
            address?: components["schemas"]["LocationAddressRequest"];
            /** Format: double */
            latitude?: number | null;
            /** Format: double */
            longitude?: number | null;
            name?: components["schemas"]["LocationNameRequest"];
            phone?: string | null;
        };
        /** @description Body of ``POST services/`` and (``partial``) ``PATCH services/{id}/`` (texts merge leaf by leaf). */
        PatchedClinicServiceWriteRequest: {
            category?: components["schemas"]["ServiceCategoryEnum"];
            /** @description Minutes, a multiple of 5 (5 … 480). */
            default_duration_min?: number;
            /** @description Suggested price when offering it; null = none. */
            default_price?: number | null;
            description?: components["schemas"]["ServiceDescriptionRequest"];
            /** @default true */
            is_active: boolean;
            name?: components["schemas"]["ServiceNameRequest"];
            position?: number;
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
            /** @default false */
            is_active: boolean;
            /** @description Default: the clinic (GET location/). */
            location_id?: number;
            name?: string;
            position?: number;
            qualifications?: components["schemas"]["SpecialistTextRequest"];
            role?: components["schemas"]["SpecialistRoleEnum"];
            /** @description The customer slot grid in minutes: 10, 15, 20, 30 (default) or 60. */
            slot_step_min?: number;
            /** @description Optional on create (derived from the name). */
            slug?: string;
            /** @description An active staff account, or null. */
            staff_user_id?: number | null;
        };
        PatchedCustomerCartQuantityRequest: {
            quantity?: number;
        };
        PatchedMePatchRequest: {
            language?: components["schemas"]["ContentLanguageEnum"];
            name?: string;
            push_enabled?: boolean;
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
         * @description ``PATCH settings/`` (contract §2.11): ``reservation_minutes`` 5..60; the phones E.164 | null; the links
         *     https | null (Telegram ``t.me`` / ``telegram.me``, Instagram ``instagram.com``); ``pickup_address.*``
         *     ≤ 200; ``terms.*`` / ``privacy_policy.*`` ≤ 50 000 and ``booking_policy.*`` ≤ 5 000, trimmed (each
         *     language optional); ``integrations``, ``terms_version`` and ``terms_updated_at`` are read-only
         *     (``read_only`` field error).
         */
        PatchedSettingsPatchRequest: {
            booking_policy?: components["schemas"]["BookingPolicyPatchRequest"];
            cosmetologist_phone?: string | null;
            instagram_url?: string | null;
            pickup_address?: components["schemas"]["PickupAddressRequest"];
            privacy_policy?: components["schemas"]["LegalTextPatchRequest"];
            reservation_minutes?: number;
            store_phone?: string | null;
            support_phone?: string | null;
            telegram_url?: string | null;
            terms?: components["schemas"]["LegalTextPatchRequest"];
            website_url?: string | null;
        };
        /**
         * @description ``PATCH staff/{id}/`` body: ``full_name`` and/or ``is_manager``; ``email``, ``is_active`` and
         *     ``password`` → ``read_only``.
         */
        PatchedStaffUpdateRequest: {
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
         * @enum {string}
         */
        PaymentProviderEnum: "click" | "payme";
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
        /**
         * @description An i18n object of a PATCH: a JSON object whose keys are ``uz`` / ``ru`` / ``en`` only (each optional).
         *     Any other value answers ``invalid`` on the object's own field; an unknown key (``"UZ"``, ``"xx"``)
         *     answers ``invalid`` on that key, never a silent no-op.
         */
        PickupAddress: {
            en?: string;
            ru?: string;
            uz?: string;
        };
        /**
         * @description An i18n object of a PATCH: a JSON object whose keys are ``uz`` / ``ru`` / ``en`` only (each optional).
         *     Any other value answers ``invalid`` on the object's own field; an unknown key (``"UZ"``, ``"xx"``)
         *     answers ``invalid`` on that key, never a silent no-op.
         */
        PickupAddressRequest: {
            en?: string;
            ru?: string;
            uz?: string;
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
            /** Format: uri */
            main_image_url: string | null;
            name: string;
            price: number;
            promo: boolean;
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
        /** @description Contract §2.3 ``ProductImage = {id, url, position}``. */
        ProductImage: {
            id: number;
            position: number;
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
        /** @description One language of ``texts``: ``{name, description, ingredients, usage}``. */
        ProductText: {
            description?: string;
            ingredients?: string;
            name?: string;
            usage?: string;
        };
        /** @description One language of ``texts``: ``{name, description, ingredients, usage}``. */
        ProductTextRequest: {
            description?: string;
            ingredients?: string;
            name?: string;
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
            usage?: string;
        };
        /** @description PATCH leaf merge: every Uzbek leaf is optional; a sent ``name`` keeps the 2..120 rule. */
        ProductUzTextPatchRequest: {
            description?: string;
            ingredients?: string;
            name?: string;
            usage?: string;
        };
        /** @description The Uzbek texts: ``name`` is mandatory on create and, whenever sent, trimmed 2..120 characters. */
        ProductUzTextRequest: {
            description?: string;
            ingredients?: string;
            name: string;
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
            billz: components["schemas"]["IntegrationModeEnum"];
            bts: components["schemas"]["IntegrationModeEnum"];
            click: components["schemas"]["IntegrationModeEnum"];
            email: components["schemas"]["IntegrationModeEnum"];
            eskiz: components["schemas"]["IntegrationModeEnum"];
            fcm: components["schemas"]["IntegrationModeEnum"];
            oauth: components["schemas"]["IntegrationModeEnum"];
            payme: components["schemas"]["IntegrationModeEnum"];
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
        PublicSettings: {
            booking_policy: string;
            cosmetologist_phone: string | null;
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
             * @description Why the refund is (or was) `manual_required`: `payme` (a Payme cabinet refund), `no_paydoc` (a Click payment without Click's payment id), `fake_mode` (Click fake under the production settings); `null` for a refund that was never manual.
             *
             *     * `payme` - payme
             *     * `no_paydoc` - no_paydoc
             *     * `fake_mode` - fake_mode
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
            /** @description Default duration. */
            duration_min: number;
            id: number;
            readonly name: string;
            price_from: number;
            price_to: number;
            readonly short_name: string;
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
        /** @description ``GET settings/`` (contract §2.11). */
        Settings: {
            readonly booking_policy: components["schemas"]["I18nText5000"];
            readonly cosmetologist_phone: string | null;
            /** Format: uri */
            readonly instagram_url: string | null;
            readonly integrations: components["schemas"]["Integrations"];
            readonly pickup_address: components["schemas"]["PickupAddress"];
            readonly privacy_policy: components["schemas"]["I18nText50000"];
            reservation_minutes: number;
            readonly store_phone: string | null;
            readonly support_phone: string | null;
            /** Format: uri */
            readonly telegram_url: string | null;
            readonly terms: components["schemas"]["I18nText50000"];
            readonly terms_unpublished_changes: boolean;
            /** Format: date-time */
            terms_updated_at: string | null;
            readonly terms_version: string | null;
            /** Format: date-time */
            updated_at: string;
            updated_by: components["schemas"]["Actor"] | null;
            /** Format: uri */
            readonly website_url: string | null;
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
            location: components["schemas"]["Location"];
            name: string;
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
        SpecialistDay: {
            blocks: components["schemas"]["DayBlock"][];
            id: number;
            is_active: boolean;
            name: string;
            role: components["schemas"]["SpecialistRoleEnum"];
            readonly working_hours: components["schemas"]["WorkingHours"] | null;
        };
        SpecialistList: {
            results: components["schemas"]["Specialist"][];
        };
        SpecialistPhotoUploadRequest: {
            /** Format: binary */
            file: string;
        };
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
        /**
         * @description ``POST staff/`` body: ``email`` (trimmed, lower-cased, unique), ``full_name`` (trimmed 2..150),
         *     ``is_manager`` (default ``false``).
         */
        StaffCreateRequest: {
            /** Format: email */
            email: string;
            full_name: string;
            /** @default false */
            is_manager: boolean;
        };
        /**
         * @description ``POST staff/`` (201) and ``POST staff/{id}/reset-password/`` (200): the account and its temporary
         *     password, shown once.
         */
        StaffCredentials: {
            staff: components["schemas"]["StaffMember"];
            /** @description Shown once; the person signs in with it and changes it under «Parolni o‘zgartirish». A replay of the same `Idempotency-Key` returns it again (stored sealed, §1.7). */
            temporary_password: string;
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
            id: number;
            is_active: boolean;
            /** @description Manager only, else `null`. */
            is_manager: boolean | null;
            /**
             * Format: date-time
             * @description Manager only, else `null`; `null` for a manager too when never signed in.
             */
            last_login_at: string | null;
            /** @description Manager only, else `null`. */
            readonly linked_providers: components["schemas"]["SocialProviderEnum"][] | null;
        };
        /** @description ``StaffMember`` (§2.16): a staff account as managers see it; every write of ``staff/`` returns it. */
        StaffMember: {
            /** Format: date-time */
            created_at: string;
            readonly display_name: string;
            /** Format: email */
            email: string;
            full_name: string;
            id: number;
            is_active: boolean;
            is_manager: boolean;
            /**
             * Format: date-time
             * @description `null`: never signed in.
             */
            last_login_at: string | null;
            readonly linked_providers: components["schemas"]["SocialProviderEnum"][];
        };
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
         * @enum {string}
         */
        TimelineTypeEnum: "order_created" | "payment_confirmed" | "payment_failed" | "shipment_created" | "handed_to_courier" | "delivered" | "cancelled" | "refund_in_progress" | "refund_succeeded";
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
        /** @description One working weekday (0 = Monday … 6 = Sunday) with its optional recurring break. */
        WorkingDay: {
            /** Format: time */
            break_end: string | null;
            /** Format: time */
            break_start: string | null;
            /** Format: time */
            end: string;
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
    admin_location_retrieve: {
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
    admin_location_partial_update: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
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
                 * @description * `scheduled` - scheduled
                 *     * `queued` - queued
                 *     * `sent` - sent
                 *     * `cancelled` - cancelled
                 */
                state?: "scheduled" | "queued" | "sent" | "cancelled";
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
    admin_notifications_cancel: {
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
    admin_orders_list: {
        parameters: {
            query?: {
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
                search?: string;
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
                 */
                provider?: "click" | "payme";
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
    admin_services_list: {
        parameters: {
            query?: {
                /**
                 * @description * `dermatology` - dermatology
                 *     * `cosmetology` - cosmetology
                 */
                category?: "dermatology" | "cosmetology";
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
                    "application/json": components["schemas"]["PaginatedClinicServiceList"];
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
    admin_services_create: {
        parameters: {
            query?: never;
            header?: never;
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
                    "application/json": components["schemas"]["ClinicService"];
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
    admin_services_retrieve: {
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
                    "application/json": components["schemas"]["ClinicService"];
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
    admin_services_partial_update: {
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
                "application/json": components["schemas"]["PatchedClinicServiceWriteRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClinicService"];
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
    admin_settings_retrieve: {
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
                    "application/json": components["schemas"]["Settings"];
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
    admin_settings_partial_update: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedSettingsPatchRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Settings"];
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
    admin_settings_terms_publish: {
        parameters: {
            query?: never;
            header: {
                /** @description Client-generated UUID; replays return the stored response with `Idempotent-Replayed: true`. */
                "Idempotency-Key": string;
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
                    "application/json": components["schemas"]["Settings"];
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
    admin_specialists_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ClinicSpecialistWriteRequest"];
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
    admin_specialists_services_update: {
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
                "application/json": components["schemas"]["OfferedServicesRequest"];
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
        requestBody?: never;
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
}
