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
