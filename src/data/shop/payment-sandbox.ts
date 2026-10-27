import "server-only";

/**
 * Local payment sandbox (`GLOWDERMA_PAYMENT_SANDBOX=true`): instead of
 * sending the browser to Click or Payme, "To‘lash" opens the order page with
 * a test panel that runs the backend's dev simulate endpoint (contract
 * §2.15, mounted only on local/test backends with `FAKE_PAYMENTS_ENABLED`).
 * For local runs and the e2e suite only; never set it on a deployment.
 */
export function paymentSandboxEnabled(): boolean {
  return process.env.GLOWDERMA_PAYMENT_SANDBOX === "true";
}
