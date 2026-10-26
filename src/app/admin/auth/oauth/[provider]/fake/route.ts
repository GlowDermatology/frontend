import type { NextRequest } from "next/server";

import { escapeHtml, htmlPage, seeOther } from "@/data/auth/html-page";
import { OAUTH_PROVIDER_LABEL, type OAuthProvider } from "@/data/auth/oauth";
import { enabledProvider, notFoundPage, redirectUriFor } from "@/data/auth/oauth-route";
import { serverEnv } from "@/lib/env.server";

/**
 * `GET /admin/auth/oauth/{provider}/fake` — the authorize step of
 * `GLOWDERMA_OAUTH_MODE=fake` (a 404 in live mode). It takes the same query
 * as the live authorize endpoint and lets the tester choose the identity the
 * backend's fake provider will report (`glowderma/integrations/oauth/fake.py`
 * in the backend):
 *
 * - success → code `fake:<subject>:<email>`;
 * - unverified email → `fake-unverified:<subject>:<email>`;
 * - the provider rejects the code → `fake-fail` (400 `oauth_exchange_failed`);
 * - the provider is down → `fake-down` (503 `provider_unavailable`);
 * - "Rad etish" → `error=access_denied`, like a user who cancels at Google.
 *
 * It only ever redirects to this provider's own callback on the public
 * origin (`redirect_uri` must equal it), so it is not an open redirect.
 */

const OUTCOMES = {
  ok: "Muvaffaqiyatli (tasdiqlangan email)",
  unverified: "Email tasdiqlanmagan",
  fail: "Provayder kodni rad etadi",
  down: "Provayder javob bermaydi",
  deny: "Rad etish (access_denied)",
} as const;
type Outcome = keyof typeof OUTCOMES;

const FORWARDED = [
  "client_id",
  "redirect_uri",
  "response_type",
  "scope",
  "state",
  "nonce",
  "code_challenge",
  "code_challenge_method",
  "prompt",
] as const;

const STYLE =
  "main{max-width:420px;width:100%;text-align:left}h1{font:700 22px/1.3 Georgia,serif;margin:0 0 4px}p{margin:0 0 16px;color:#5c5240}form{display:flex;flex-direction:column;gap:14px}label{display:flex;flex-direction:column;gap:6px;font-weight:600}input[type=text],input[type=email]{font:inherit;height:44px;padding:0 12px;border:1px solid #8a7d63;border-radius:8px;background:#fff;color:#2a2418}fieldset{border:1px solid #d9cfba;border-radius:8px;padding:10px 14px;margin:0;display:flex;flex-direction:column;gap:8px}legend{font-weight:600;padding:0 4px}fieldset label{flex-direction:row;align-items:center;gap:8px;font-weight:400;min-height:24px}button{font:inherit;font-weight:700;height:48px;border:0;border-radius:8px;background:#2a2418;color:#fbf8f2;cursor:pointer}:focus-visible{outline:3px solid #7a5a14;outline-offset:2px}.error{color:#a12c2c;font-weight:600}code{font-size:13px}";

function readOutcome(value: string | null): Outcome | null {
  return value !== null && value in OUTCOMES ? (value as Outcome) : null;
}

/** The fake code grammar splits on `:`, so a part may not contain one. */
function validPart(value: string | null, max: number): value is string {
  return (
    typeof value === "string" && value.length > 0 && value.length <= max && !value.includes(":")
  );
}

function form(
  provider: OAuthProvider,
  params: URLSearchParams,
  values: { subject: string; email: string; outcome: Outcome },
  error: string | null,
) {
  const label = OAUTH_PROVIDER_LABEL[provider];
  const hidden = FORWARDED.map((name) => {
    const value = params.get(name);
    return value === null
      ? ""
      : `<input type="hidden" name="${name}" value="${escapeHtml(value)}">`;
  }).join("");
  const radios = (Object.keys(OUTCOMES) as Outcome[])
    .map(
      (key) =>
        `<label><input type="radio" name="outcome" value="${key}"${key === values.outcome ? " checked" : ""}> ${escapeHtml(OUTCOMES[key])}</label>`,
    )
    .join("");
  const errorBlock = error
    ? `<p class="error" role="alert" id="fake-error">${escapeHtml(error)}</p>`
    : "";
  const describedBy = error ? ` aria-describedby="fake-error"` : "";
  return htmlPage(
    `${label} (sinov) — Glow Derma Admin`,
    `<h1>${escapeHtml(label)} — sinov provayderi</h1><p>GLOWDERMA_OAUTH_MODE=fake: haqiqiy ${escapeHtml(label)} o‘rniga backendning soxta provayderi ishlatiladi. Kod <code>fake:&lt;identifikator&gt;:&lt;email&gt;</code> bo‘ladi.</p>${errorBlock}<form method="get" novalidate>${hidden}<label>Identifikator (subject)<input type="text" name="subject" required maxlength="100" autocomplete="off" value="${escapeHtml(values.subject)}"${describedBy}></label><label>Email<input type="email" name="email" required maxlength="254" autocomplete="off" value="${escapeHtml(values.email)}"${describedBy}></label><fieldset><legend>Natija</legend>${radios}</fieldset><button type="submit">Davom etish</button></form>`,
    { status: error ? 400 : 200 },
    STYLE,
  );
}

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/admin/auth/oauth/[provider]/fake">,
) {
  const { provider: param } = await ctx.params;
  const enabled = enabledProvider(param);
  if (!enabled || enabled.config.mode !== "fake") return notFoundPage();
  const { provider } = enabled;
  const params = request.nextUrl.searchParams;

  const expected = redirectUriFor(request, provider, serverEnv.cookieSecure());
  const redirectUri = params.get("redirect_uri");
  const state = params.get("state");
  if (!expected || redirectUri !== expected || !state) {
    return htmlPage(
      "So‘rov noto‘g‘ri — Glow Derma Admin",
      `<h1 style="font:700 20px/1.3 Georgia,serif;margin:0 0 12px">So‘rov noto‘g‘ri</h1><p>redirect_uri yoki state yo‘q yoki noto‘g‘ri.</p><p><a href="/admin/login">Kirish sahifasiga</a></p>`,
      { status: 400 },
    );
  }

  const outcome = readOutcome(params.get("outcome"));
  const subject = params.get("subject")?.trim() ?? "";
  const email = params.get("email")?.trim() ?? "";
  if (outcome === null) {
    return form(provider, params, { subject: "", email: "", outcome: "ok" }, null);
  }

  const back = new URL(expected);
  back.searchParams.set("state", state);
  if (outcome === "deny") {
    back.searchParams.set("error", "access_denied");
    return seeOther(back.toString());
  }
  if (outcome === "fail" || outcome === "down") {
    back.searchParams.set("code", outcome === "fail" ? "fake-fail" : "fake-down");
    return seeOther(back.toString());
  }
  if (!validPart(subject, 100) || !validPart(email, 254)) {
    return form(
      provider,
      params,
      { subject, email, outcome },
      "Identifikator va emailni kiriting (“:” belgisisiz).",
    );
  }
  back.searchParams.set(
    "code",
    `${outcome === "ok" ? "fake" : "fake-unverified"}:${subject}:${email}`,
  );
  return seeOther(back.toString());
}
