import "server-only";

/**
 * Local payment sandbox (`GLOWDERMA_PAYMENT_SANDBOX=true`): instead of
 * sending the browser to Click or Payme, "To‘lash" opens the order page with
 * a test panel that runs the backend's dev simulate endpoint (contract
 * §2.15, mounted only on local/test backends with `FAKE_PAYMENTS_ENABLED`).
 *
 * A production server (`NODE_ENV=production`, i.e. `next start` and the
 * Docker image) needs a second opt-in, `GLOWDERMA_PAYMENT_SANDBOX_ALLOW=true`
 * (local e2e runs set both), and logs a warning once: on a real deployment
 * the sandbox would only hide the real payment pages.
 */

let warned = false;

export function sandboxAllowed(env: Record<string, string | undefined>): boolean {
  if (env.GLOWDERMA_PAYMENT_SANDBOX !== "true") return false;
  if (env.NODE_ENV !== "production") return true;
  return env.GLOWDERMA_PAYMENT_SANDBOX_ALLOW === "true";
}

export function paymentSandboxEnabled(): boolean {
  const allowed = sandboxAllowed(process.env);
  if (allowed && process.env.NODE_ENV === "production" && !warned) {
    warned = true;
    console.warn(
      "[shop] payment sandbox is ON on a production server (GLOWDERMA_PAYMENT_SANDBOX_ALLOW=true): customers never reach Click/Payme",
    );
  }
  return allowed;
}
