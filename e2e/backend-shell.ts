import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Test-only access to the backend's fake-provider switches through its
 * management shell (`uv run python manage.py shell`), for outcomes no API
 * exposes: the admin API cannot set `Order.metadata.fake` (design 03 §1.3).
 * Used only by the e2e specs, never by `src/`.
 *
 * `E2E_BACKEND_DIR` is the backend checkout (the directory with
 * `manage.py`); unset, the specs that need it are skipped. Its `.env` is
 * loaded into the shell's environment (Django reads `os.environ` only),
 * nothing of it is printed. The backend must run with fake integrations
 * and `CELERY_TASK_ALWAYS_EAGER` (the local settings), so a cancel tries
 * the Click refund at once.
 */
export const BACKEND_DIR = process.env.E2E_BACKEND_DIR;

/** Reads `KEY=VALUE` lines of the backend's `.env` (no expansion, quotes stripped). */
function backendEnv(dir: string): Record<string, string> {
  const file = join(dir, ".env");
  if (!existsSync(file)) return {};
  const env: Record<string, string> = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) continue;
    env[match[1]!] = match[2]!.trim().replace(/^(['"])(.*)\1$/, "$2");
  }
  return env;
}

/** Runs `code` in the backend's Django shell and returns its stdout. */
function djangoShell(code: string): string {
  if (!BACKEND_DIR) throw new Error("E2E_BACKEND_DIR is not set");
  return execFileSync("uv", ["run", "python", "manage.py", "shell", "-c", code], {
    cwd: BACKEND_DIR,
    env: { ...process.env, ...backendEnv(BACKEND_DIR) },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 60_000,
  });
}

/**
 * The fake Click's scenario of one order (`Order.metadata.fake.click`):
 * `refund: "failed"` makes its refund fail; `status` forces what Click's
 * status check answers (`"paid"`, `"reversed"`, `"down"`), else it answers
 * "paid" until a refund reversed the payment.
 */
export interface FakeClickScenario {
  refund?: "succeeded" | "failed" | "unknown" | "down";
  status?: "paid" | "reversed" | "down";
}

/** Sets `Order.metadata.fake.click` of `orderId`, keeping the rest of its metadata. */
export function setFakeClickScenario(orderId: number, scenario: FakeClickScenario): void {
  const code = [
    "import json",
    "from glowderma.commerce.models import Order",
    `order = Order.objects.get(pk=${Number(orderId)})`,
    "metadata = order.metadata if isinstance(order.metadata, dict) else {}",
    "fake = metadata.get('fake') if isinstance(metadata.get('fake'), dict) else {}",
    `fake['click'] = json.loads(${JSON.stringify(JSON.stringify(scenario))})`,
    "metadata['fake'] = fake",
    "order.metadata = metadata",
    "order.save(update_fields=['metadata'])",
    "print(json.dumps(order.metadata['fake']['click']))",
  ].join("\n");
  const answer = djangoShell(code).trim().split("\n").at(-1) ?? "";
  if (JSON.stringify(JSON.parse(answer)) !== JSON.stringify(scenario)) {
    throw new Error(`the backend did not store the Click scenario of order ${orderId}: ${answer}`);
  }
}
