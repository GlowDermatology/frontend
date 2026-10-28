/**
 * The idempotency-key hook moved to `src/lib/actions/idempotency.ts`, shared
 * by the admin panel and the storefront; this re-export keeps the admin call
 * sites unchanged.
 */
export {
  newIdempotencyKey,
  shouldRenewKey,
  useIdempotencyKey,
  type IdempotencyKey,
} from "@/lib/actions/idempotency";
