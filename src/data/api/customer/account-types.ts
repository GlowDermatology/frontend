import type { components } from "../schema";

/**
 * Named aliases over the generated types of the signed-in customer API (W3b):
 * auth (contract §2.1), me (§2.2, hybrid identity B-W2, sessions B-W1), cart,
 * delivery, checkout and orders (§2.5–§2.8), loyalty (§2.9), appointments
 * (§2.11) and the inbox (§2.12).
 */
type Schemas = components["schemas"];

export type ApiAuthTokens = Schemas["AuthTokens"];
export type ApiNextStep = Schemas["NextStep"];
export type ApiAuthTokensOrNextStep = Schemas["AuthTokensOrNextStep"];
export type ApiCodeIssue = Schemas["CodeIssue"];
export type ApiVerification = Schemas["Verification"];
export type ApiNonce = Schemas["Nonce"];
export type ApiOtpPurpose = Schemas["OtpPurposeEnum"];
export type ApiSocialProvider = Schemas["CustomerSocialProviderEnum"];
export type ApiSendCodeRequest = Schemas["SendCodeRequest"];
export type ApiVerifyCodeRequest = Schemas["VerifyCodeRequest"];
export type ApiSetPasswordRequest = Schemas["SetPasswordRequest"];
export type ApiResetPasswordRequest = Schemas["ResetPasswordRequest"];
export type ApiLoginRequest = Schemas["CustomerLoginRequest"];
export type ApiSocialRequest = Schemas["SocialRequest"];
export type ApiSocialCompleteRequest = Schemas["SocialCompleteRequest"];

export type ApiMe = Schemas["CustomerMe"];
export type ApiMePatch = Schemas["PatchedMePatchRequest"];
export type ApiAddress = Schemas["CustomerAddress"];
export type ApiAddressList = Schemas["CustomerAddressList"];
export type ApiAddressWrite = Schemas["AddressWriteRequest"];
export type ApiReauth = Schemas["ReauthRequest"];
export type ApiPasswordChange = Schemas["MePasswordRequest"];
export type ApiPhoneAttach = Schemas["MePhoneRequest"];
export type ApiEmailAttach = Schemas["MeEmailRequest"];
export type ApiSocialLink = Schemas["MeSocialLinkRequest"];
export type ApiSession = Schemas["CustomerSession"];
export type ApiSessionPage = Schemas["PaginatedCustomerSessionList"];
export type ApiRevokedSessions = Schemas["RevokedSessions"];

export type ApiCart = Schemas["CustomerCart"];
export type ApiCartLine = Schemas["CustomerCartLine"];
export type ApiRegionCatalog = Schemas["RegionCatalog"];
export type ApiDeliveryQuote = Schemas["CustomerDeliveryQuote"];
export type ApiDeliveryCalculate = Schemas["CustomerDeliveryCalculateRequest"];
export type ApiCheckoutRequest = Schemas["CustomerCheckoutRequest"];
export type ApiOrderDetail = Schemas["CustomerOrderDetail"];
export type ApiOrderSummary = Schemas["CustomerOrderSummary"];
export type ApiOrderPage = Schemas["PaginatedCustomerOrderSummaryList"];
export type ApiPayLink = Schemas["CustomerPayLink"];

export type ApiCashbackSummary = Schemas["CashbackSummary"];
export type ApiLedgerItem = Schemas["LedgerItem"];
export type ApiLedgerPage = Schemas["PaginatedLedgerItemList"];
export type ApiQrToken = Schemas["QrToken"];

export type ApiAppointment = Schemas["CustomerAppointment"];
export type ApiAppointmentPage = Schemas["PaginatedCustomerAppointmentList"];
export type ApiFreeSlots = Schemas["FreeSlots"];
export type ApiBookingRequest = Schemas["BookingRequest"];

export type ApiInboxItem = Schemas["InboxItem"];
export type ApiInboxPage = Schemas["PaginatedInboxItemList"];
export type ApiRead = Schemas["Read"];
export type ApiReadAll = Schemas["ReadAll"];
export type ApiUnreadCount = Schemas["UnreadCount"];

/** Whether a sign-in answer carries tokens (else it asks for one more step). */
export function isAuthTokens(value: ApiAuthTokensOrNextStep): value is ApiAuthTokens {
  return typeof (value as Partial<ApiAuthTokens>).access === "string";
}
