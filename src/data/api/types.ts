/**
 * Named aliases over the generated OpenAPI types (`npm run gen:api`), so the
 * auth code and the mappers never spell `components["schemas"][...]`.
 */
import type { components } from "./schema";

export type Schemas = components["schemas"];

/** The session answer of `auth/login/`, `auth/oauth/{provider}/` and `auth/mfa/verify/`. */
export type LoginResponse = Schemas["LoginResponse"];
/**
 * `POST auth/login/` and `auth/oauth/{provider}/` 200: a session, or — with the admin panel MFA on —
 * the `MfaChallenge` for `auth/mfa/verify/` (tell them apart with `isMfaChallengeAnswer`).
 */
export type AdminLoginResult = Schemas["AdminLoginResult"];
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
/** `PUT …/images/{image_id}/renditions/` per shape: `[x, y, w, h]`, `"auto"` or `null` (left out: kept). */
export type ApiImageRenditionsPut = Partial<
  Record<
    keyof Schemas["ImageRenditionsPutRequest"],
    [number, number, number, number] | "auto" | null
  >
>;

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

/* --- AI assistant (contract §2.19) --- */
export type ApiAssistantStatus = Schemas["AssistantStatus"];
export type ApiAssistantStart = Schemas["AssistantStart"];
export type ApiAssistantJob = Schemas["AssistantJob"];
export type ApiAssistantSuggestion = Schemas["AssistantSuggestion"];
export type ApiAssistantJobCreate = Partial<Schemas["AssistantJobCreateRequest"]>;
export type ApiAssistantAccept = Schemas["AssistantAcceptRequest"];
export type ApiAssistantAcceptResult = Schemas["AssistantAcceptResult"];

/* --- Appointments (contract §2.9) --- */

export type ApiAppointmentClinic = Schemas["AppointmentClinic"];
export type ApiDaySchedule = Schemas["DaySchedule"];
export type ApiSpecialistDay = Schemas["SpecialistDay"];
export type ApiDayBlock = Schemas["DayBlock"];
export type ApiAppointmentItem = Schemas["AppointmentItem"];
export type ApiPendingSummary = Schemas["PendingSummary"];
export type ApiAppointmentsMeta = Schemas["AppointmentsMeta"];
/** `GET appointments/range/` (week and month boards). */
export type ApiAppointmentRange = Schemas["AppointmentRange"];
export type ApiRangeDay = Schemas["RangeDay"];
export type ApiRangeSchedule = Schemas["RangeSchedule"];
export type ApiBookingSpecialist = Schemas["BookingSpecialist"];
export type ApiAppointmentCreate = Schemas["AppointmentCreateRequest"];
export type ApiAppointmentReschedule = Schemas["AppointmentRescheduleRequest"];
export type ApiAppointmentCancel = Partial<Schemas["AppointmentCancelRequest"]>;

/* --- Notifications, templates, segments (contract §2.8) --- */

export type ApiNotificationRecord = Schemas["NotificationRecord"];
export type ApiNotificationState = Schemas["NotificationStateEnum"];
export type ApiCampaignTest = Schemas["CampaignTest"];
export type ApiPaginatedNotifications = Schemas["PaginatedNotificationRecordList"];
export type ApiNotificationMeta = Schemas["NotificationMeta"];
export type ApiTestDevice = Schemas["TestDevice"];
export type ApiTestDeviceCreate = Schemas["TestDeviceCreateRequest"];
export type ApiCampaignTestRequest = Schemas["SendTestInputRequest"];
export type ApiApproveRequest = Schemas["ApproveInputRequest"];
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

/* --- Shell: audit log, nav counts (contract §2.10, §2.13) --- */

export type ApiAuditEntry = Schemas["AuditEntry"];
export type ApiPaginatedAuditLog = Schemas["PaginatedAuditEntryList"];
export type ApiAuditFacets = Schemas["AuditFacets"];
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
/** `POST specialists/invite/` 201: the account, its credentials and the new draft profile. */
export type ApiSpecialistInviteCredentials = Schemas["SpecialistInviteCredentials"];
export type ApiSpecialistInvite = Schemas["WorkforceInviteRequest"];
/** `POST staff/{id}/specialist-role/` body and 200. */
export type ApiSpecialistRoleChange = Schemas["SpecialistRoleChangeRequest"];
export type ApiSpecialistRoleChangeResult = Schemas["SpecialistRoleChangeResult"];
export type ApiStaffCreate = Schemas["StaffCreateRequest"];
export type ApiStaffPatch = Partial<Schemas["PatchedStaffUpdateRequest"]>;
export type ApiPaginatedStaff = Schemas["PaginatedStaffListItemList"];
export type ApiStaffInvite = Schemas["StaffInvite"];
export type ApiStaffResetPassword = Schemas["StaffResetPasswordRequest"];
/** `POST staff/{id}/send-password-link/` 200. */
export type ApiStaffLinkSent = Schemas["StaffLinkSent"];
/** `POST auth/password-link/` 200 (the caller's own link). */
export type ApiOwnPasswordLink = Schemas["OwnPasswordLink"];
/** `POST auth/password-token/check/` 200. */
export type ApiPasswordTokenInfo = Schemas["PasswordTokenInfo"];
export type ApiPasswordTokenSet = Schemas["PasswordTokenSetRequest"];

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
type I18nPartial = Partial<Record<"uz" | "ru" | "en", string>>;
/** `PATCH specialists/{id}/`: every field optional (the generated type marks the defaulted booleans required). */
export type ApiSpecialistPatch = Omit<
  Partial<Schemas["PatchedClinicSpecialistPatchRequest"]>,
  "qualifications" | "bio"
> & { qualifications?: I18nPartial; bio?: I18nPartial };
/**
 * `PATCH specialist/profile/` (the specialist's own profile): every profile field but the clinics
 * and the site order, which stay with staff; texts merge leaf by leaf.
 */
export type ApiOwnProfilePatch = Omit<
  Partial<Schemas["PatchedOwnProfileRequest"]>,
  "qualifications" | "bio"
> & { qualifications?: I18nPartial; bio?: I18nPartial };
/** `GET|PATCH specialist/profile/`: the own profile plus the assigned clinics (primary first). */
export type ApiSpecialistOwnProfile = Schemas["SpecialistOwnProfile"];
/** `GET specialist/availability/`. */
export type ApiSpecialistAvailability = Schemas["SpecialistAvailability"];
export type ApiWorkingWeekWrite = Schemas["WorkingWeekRequest"];
export type ApiHoursOverride = Schemas["HoursOverride"];
export type ApiPaginatedOverrides = Schemas["PaginatedHoursOverrideList"];
export type ApiOverrideWrite = Schemas["HoursOverrideCreateRequest"];
export type ApiBlockedPeriod = Schemas["BlockedPeriod"];
export type ApiPaginatedBlocks = Schemas["PaginatedBlockedPeriodList"];
export type ApiBlockWrite = Schemas["BlockedPeriodCreateRequest"];
/** One specialist's own service (`ClinicSpecialist.services`). */
export type ApiClinicService = Schemas["ClinicService"];
/** `POST specialists/{id}/services/` and `POST specialist/services/`. */
export type ApiClinicServiceWrite = Schemas["ClinicServiceWriteRequest"];
/** `PATCH …/services/{id}/`: changed fields only; the texts merge leaf by leaf. */
export type ApiClinicServicePatch = Omit<
  Partial<Schemas["PatchedClinicServiceWriteRequest"]>,
  "name" | "short_name" | "description"
> & { name?: I18nPartial; short_name?: I18nPartial; description?: I18nPartial };
export type ApiClinicLocation = Schemas["ClinicLocation"];
export type ApiClinicLocations = Schemas["ClinicLocations"];
export type ApiLocationPatch = Omit<
  Partial<Schemas["PatchedClinicLocationPatchRequest"]>,
  "name" | "address" | "directions"
> & { name?: I18nPartial; address?: I18nPartial; directions?: I18nPartial };
export type ApiConflicts = { results: ApiAppointmentItem[] };

/* --- The specialist's own appointments board (`specialist/appointments/…`) --- */

/** The admin item without the customer's e-mail, plus `customer_note` and `allowed_actions`. */
export type ApiSpecialistAppointmentItem = Schemas["SpecialistAppointmentItem"];
export type ApiSpecialistAppointmentDay = Schemas["SpecialistAppointmentDay"];
export type ApiSpecialistAppointmentRange = Schemas["SpecialistAppointmentRange"];
export type ApiSpecialistAppointmentCreate = Schemas["SpecialistAppointmentCreateRequest"];
export type ApiSpecialistReschedule = Schemas["SpecialistRescheduleRequest"];
export type ApiSpecialistConflicts = Schemas["SpecialistConflicts"];

/* --- Yandex Delivery: carrier view, exception queue, dispatch switch (plan §3.9, §3.10) --- */

export type ApiOrderDelivery = Schemas["OrderDelivery"];
export type ApiDeliveryIssueRef = Schemas["DeliveryIssueRef"];
export type ApiDeliveryIssue = Schemas["DeliveryIssue"];
export type ApiPaginatedDeliveryIssues = Schemas["PaginatedDeliveryIssueList"];
export type ApiDashboardFulfilment = Schemas["DashboardFulfilment"];
export type ApiSuspension = Schemas["Suspension"];
export type ApiSuspensionBody = Schemas["SuspensionBodyRequest"];
/** `POST orders/{id}/issues/`: staff may open only `incident`. */
export type ApiOpenIssue = Omit<Schemas["OpenIssueRequest"], "kind"> & { kind: "incident" };
export type ApiResolveIssue = Schemas["ResolveIssueRequest"];
/** `POST orders/{id}/dispatch/` (plan §3.6): staff checked the parcel and weighed it. */
export type ApiDispatchRequest = Schemas["DispatchRequest"];
/** `POST orders/{id}/confirm-return/` (plan §3.8): the parcel is back at the warehouse. */
export type ApiConfirmReturn = Schemas["ConfirmReturnRequest"];
export type ApiDeliveryIssuesQuery = NonNullable<
  import("./schema").operations["admin_delivery_issues_list"]["parameters"]["query"]
>;
