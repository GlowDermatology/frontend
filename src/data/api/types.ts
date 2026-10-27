/**
 * Named aliases over the generated OpenAPI types (`npm run gen:api`), so the
 * auth code and the mappers never spell `components["schemas"][...]`.
 */
import type { components } from "./schema";

export type Schemas = components["schemas"];

/** `POST auth/login/` 200 (also `auth/oauth/{provider}/`). */
export type LoginResponse = Schemas["LoginResponse"];
/** `POST auth/refresh/` 200. */
export type AccessResponse = Schemas["Access"];
/** `GET auth/me/` and `LoginResponse.user`. */
export type Me = Schemas["Me"];
/** Every non-2xx body (contract §1.6). */
export type ErrorEnvelope = Schemas["ErrorEnvelope"];
export type ErrorItem = Schemas["ErrorItem"];

export type LoginRequest = Schemas["LoginRequest"];
export type RefreshRequest = Schemas["RefreshRequest"];
export type LogoutRequest = Schemas["LogoutRequest"];
export type ChangePasswordRequest = Schemas["ChangePasswordRequest"];
/** Body of `POST auth/oauth/{provider}/` and `…/link/` (contract §2.1, M0b). */
export type OAuthCallbackRequest = Schemas["OAuthCallbackRequest"];
export type SocialProvider = Schemas["SocialProviderEnum"];

/* --- Catalog (contract §2.3–§2.5, §2.14) --- */

export type ApiProduct = Schemas["Product"];
export type ApiProductImage = Schemas["ProductImage"];
export type ApiProductTexts = Schemas["ProductTexts"];
export type ApiProductStats = Schemas["ProductStats"];
export type ApiLastChange = Schemas["LastChange"];
export type ApiProductWrite = Schemas["ProductWriteRequest"];
/**
 * `PATCH products/{id}/`. The generated schema reuses the create shape for
 * `texts` (`uz.name` required), but the server merges `texts` at leaf level
 * (contract §2.3), so a patch carries only the changed leaves.
 */
export type ApiProductPatch = Omit<Partial<Schemas["PatchedProductPatchRequest"]>, "texts"> & {
  texts?: Partial<Record<"uz" | "ru" | "en", Schemas["ProductTextRequest"]>>;
};
export type ApiPaginatedProducts = Schemas["PaginatedProductList"];
export type ApiImagesResponse = Schemas["ImagesResponse"];

export type ApiCategory = Schemas["Category"];
export type ApiCategoryWrite = Schemas["CategoryWriteRequest"];
export type ApiCategoryPatch = Partial<Schemas["PatchedCategoryPatchRequest"]>;
export type ApiPaginatedCategories = Schemas["PaginatedCategoryList"];
export type ApiCategoryResults = Schemas["CategoryResults"];

export type ApiBanner = Schemas["Banner"];
export type ApiBannerLink = Schemas["BannerLink"];
/** `PATCH banners/{id}/` (JSON): changed fields only; `title` merges at leaf level like product texts. */
export type ApiBannerPatch = Omit<Partial<Schemas["PatchedBannerPatchRequest"]>, "title"> & {
  title?: Partial<Schemas["BannerTitlePatchRequest"]>;
};
export type ApiPaginatedBanners = Schemas["PaginatedBannerList"];
export type ApiBannerResults = Schemas["BannerResults"];

export type ApiJob = Schemas["Job"];
export type ApiJobState = Schemas["JobStateEnum"];
export type ApiBillzImportRequest = Partial<Schemas["BillzImportRequest"]>;

/* --- Appointments (contract §2.9) --- */

export type ApiDaySchedule = Schemas["DaySchedule"];
export type ApiSpecialistDay = Schemas["SpecialistDay"];
export type ApiDayBlock = Schemas["DayBlock"];
export type ApiAppointmentItem = Schemas["AppointmentItem"];
export type ApiPendingSummary = Schemas["PendingSummary"];
export type ApiAppointmentsMeta = Schemas["AppointmentsMeta"];
export type ApiBookingSpecialist = Schemas["BookingSpecialist"];
/**
 * `POST appointments/`. The generated schema marks `note` required, the
 * contract makes it optional (≤300); the action always sends a string.
 */
export type ApiAppointmentCreate = Schemas["AppointmentCreateRequest"];
export type ApiAppointmentReschedule = Schemas["AppointmentRescheduleRequest"];
export type ApiAppointmentCancel = Partial<Schemas["AppointmentCancelRequest"]>;

/* --- Notifications, templates, segments (contract §2.8) --- */

export type ApiNotificationRecord = Schemas["NotificationRecord"];
export type ApiPaginatedNotifications = Schemas["PaginatedNotificationRecordList"];
export type ApiNotificationMeta = Schemas["NotificationMeta"];
export type ApiStatusTemplate = Schemas["StatusTemplate"];
export type ApiTemplateStatus = Schemas["TemplateStatusEnum"];
export type ApiTemplateUpdate = Schemas["TemplateUpdateRequest"];
export type ApiSegment = Schemas["Segment"];
export type ApiSegmentRules = Schemas["SegmentRules"];
export type ApiSegmentWrite = Schemas["SegmentWriteRequest"];
export type ApiSegmentPatch = Partial<Schemas["PatchedSegmentWriteRequest"]>;
export type ApiPaginatedSegments = Schemas["PaginatedSegmentList"];
export type ApiCustomerListItem = Schemas["CustomerListItem"];
export type ApiPaginatedCustomers = Schemas["PaginatedCustomerListItemList"];

/* --- Shell: settings, audit log, nav counts (contract §2.10, §2.11, §2.13) --- */

export type ApiSettings = Schemas["Settings"];
type I18nLeaves = Partial<Record<"uz" | "ru" | "en", string>>;
export type ApiSettingsPatch = Omit<
  Partial<Schemas["PatchedSettingsPatchRequest"]>,
  "pickup_address" | "terms" | "privacy_policy" | "booking_policy"
> & {
  pickup_address?: I18nLeaves;
  terms?: I18nLeaves;
  privacy_policy?: I18nLeaves;
  booking_policy?: I18nLeaves;
};
export type ApiAuditEntry = Schemas["AuditEntry"];
export type ApiPaginatedAuditLog = Schemas["PaginatedAuditEntryList"];
export type ApiNavCounts = Schemas["NavCounts"];
export type ApiActor = Schemas["Actor"];

/* --- Customers, cashback policy and the staff directory (F2c: contract §2.6, §2.7, §2.16) --- */

export type ApiCustomerCard = Schemas["CustomerCard"];
export type ApiCustomerTier = Schemas["CustomerTier"];
export type ApiLedgerEntry = Schemas["LedgerEntry"];
export type ApiPurchase = Schemas["Purchase"];
export type ApiCustomerOrdering = NonNullable<
  NonNullable<
    import("./schema").operations["admin_customers_list"]["parameters"]["query"]
  >["ordering"]
>;
export type ApiCustomerSession = Schemas["AdminCustomerSession"];
export type ApiPaginatedCustomerSessions = Schemas["PaginatedAdminCustomerSessionList"];
export type ApiCashbackAdjustmentRequest = Schemas["CashbackAdjustmentRequest"];
export type ApiCashbackAdjustmentResult = Schemas["CashbackAdjustmentResult"];
export type ApiCashbackPolicy = Schemas["CashbackPolicy"];
export type ApiPolicyVersion = Schemas["PolicyVersion"];
export type ApiPolicyVersionCreate = Schemas["PolicyVersionCreateRequest"];
export type ApiPolicyVersionCreated = Schemas["PolicyVersionCreated"];
export type ApiTierWarning = Schemas["TierWarning"];
/** `POST segments/{id}/members/`: either list or both (contract §2.8). */
export type ApiSegmentMembersInput = Schemas["SegmentMembersInputRequest"];
export type ApiStaffListItem = Schemas["StaffListItem"];
export type ApiStaffMember = Schemas["StaffMember"];
export type ApiStaffCredentials = Schemas["StaffCredentials"];
export type ApiStaffCreate = Schemas["StaffCreateRequest"];
export type ApiStaffPatch = Partial<Schemas["PatchedStaffUpdateRequest"]>;
export type ApiPaginatedStaff = Schemas["PaginatedStaffListItemList"];

/* --- Orders, payments, dashboard (contract §2.2, §2.10, §2.12) — F2d --- */

/**
 * openapi-typescript turns the `allOf: [Shipment]` of the order shapes into
 * `Omit<Shipment, "state">`, which drops the discriminant; the payload is the
 * plain `Shipment` union (contract §2.2), so it is restored here.
 */
export type ApiShipment = Schemas["Shipment"];
export type ApiOrderSummary = Omit<Schemas["OrderSummary"], "shipment"> & {
  shipment: ApiShipment;
};
export type ApiOrderDetail = Omit<Schemas["OrderDetail"], "shipment"> & { shipment: ApiShipment };
export type ApiPaginatedOrders = Omit<Schemas["PaginatedOrderSummaryList"], "results"> & {
  results: ApiOrderSummary[];
};
export type ApiStatusCounts = Schemas["StatusCounts"];
export type ApiOrderEvent = Schemas["OrderEvent"];
export type ApiOrderEventType = Schemas["OrderEventTypeEnum"];
export type ApiOrderItem = Schemas["OrderItem"];
export type ApiOrderCashback = Schemas["OrderCashback"];
export type ApiCashbackHold = Schemas["CashbackHold"];
export type ApiRefund = Schemas["Refund"];
export type ApiRefundState = Schemas["RefundStateEnum"];
export type ApiCancelOrder = Schemas["CancelOrderRequest"];
export type ApiTransition = Schemas["TransitionRequest"];
export type ApiPayment = Schemas["Payment"];
export type ApiPaginatedPayments = Schemas["PaginatedPaymentList"];
/**
 * `POST payments/{id}/refunds/{refund_id}/resolve/`: only these two states
 * are accepted; `manual_payout` closes a failed Click refund Click still
 * reports paid (M2, §7 item 18; ignored for other refunds).
 */
export type ApiResolveRefund = Omit<Schemas["ResolveRefundRequest"], "state" | "manual_payout"> & {
  state: "succeeded" | "failed";
  manual_payout?: boolean;
};
export type ApiDashboard = Schemas["Dashboard"];
export type ApiDashboardBucket = Schemas["DashboardBucket"];
export type ApiDashboardRange = Schemas["DashboardRangeEnum"];

/* --- Specialists, services, schedules, the clinic (contract §2.17, gap FND-1) --- */

export type ApiClinicSpecialist = Schemas["ClinicSpecialist"];
export type ApiPaginatedSpecialists = Schemas["PaginatedClinicSpecialistList"];
export type ApiSpecialistWrite = Schemas["ClinicSpecialistWriteRequest"];
type I18nPartial = Partial<Record<"uz" | "ru" | "en", string>>;
/** `PATCH specialists/{id}/`: every field optional (the generated type marks the defaulted booleans required). */
export type ApiSpecialistPatch = Omit<
  Partial<Schemas["PatchedClinicSpecialistPatchRequest"]>,
  "qualifications" | "bio"
> & { qualifications?: I18nPartial; bio?: I18nPartial };
export type ApiOfferedServicesWrite = Schemas["OfferedServicesRequest"];
export type ApiWorkingWeekWrite = Schemas["WorkingWeekRequest"];
export type ApiHoursOverride = Schemas["HoursOverride"];
export type ApiPaginatedOverrides = Schemas["PaginatedHoursOverrideList"];
export type ApiOverrideWrite = Schemas["HoursOverrideCreateRequest"];
export type ApiBlockedPeriod = Schemas["BlockedPeriod"];
export type ApiPaginatedBlocks = Schemas["PaginatedBlockedPeriodList"];
export type ApiBlockWrite = Schemas["BlockedPeriodCreateRequest"];
export type ApiClinicService = Schemas["ClinicService"];
export type ApiPaginatedServices = Schemas["PaginatedClinicServiceList"];
export type ApiServiceWrite = Schemas["ClinicServiceWriteRequest"];
export type ApiServicePatch = Omit<
  Partial<Schemas["PatchedClinicServiceWriteRequest"]>,
  "name" | "short_name" | "description"
> & { name?: I18nPartial; short_name?: I18nPartial; description?: I18nPartial };
export type ApiClinicLocation = Schemas["ClinicLocation"];
export type ApiLocationPatch = Omit<
  Partial<Schemas["PatchedClinicLocationPatchRequest"]>,
  "name" | "address"
> & { name?: I18nPartial; address?: I18nPartial };
export type ApiConflicts = { results: ApiAppointmentItem[] };
