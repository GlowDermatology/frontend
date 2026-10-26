import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/data/api/auth", () => ({
  apiOAuthLogin: vi.fn(),
  apiOAuthLink: vi.fn(),
  apiRefresh: vi.fn(),
}));

import { GET as callback } from "@/app/admin/auth/oauth/[provider]/callback/route";
import { GET as fake } from "@/app/admin/auth/oauth/[provider]/fake/route";
import { GET as start } from "@/app/admin/auth/oauth/[provider]/start/route";
import { apiOAuthLink, apiOAuthLogin, apiRefresh } from "@/data/api/auth";
import { ApiError } from "@/data/api/errors";

import { fakeJwt } from "./jwt.fixture";
import { deriveOAuthKey, openNotice, pkceChallenge, sealFlow, newFlow } from "./oauth";

/**
 * Route-level tests of the OAuth start, fake-authorize and callback handlers
 * (contract §2.1): cookie attributes, state checks, the exchange body, the
 * session cookies and where each failure lands. Django is mocked.
 */

const HOST = "localhost:3113";
const SECRET = "route-test-secret";
const key = deriveOAuthKey(SECRET);

const ctx = (provider: string) => ({ params: Promise.resolve({ provider }) });

function get(path: string, options: { cookies?: string; headers?: Record<string, string> } = {}) {
  const headers = new Headers({ host: HOST, "sec-fetch-site": "same-origin", ...options.headers });
  if (options.cookies) headers.set("cookie", options.cookies);
  return new NextRequest(`http://${HOST}${path}`, { headers });
}

function setCookies(response: Response): string[] {
  return response.headers.getSetCookie();
}

function noticeOf(location: string | null) {
  const token = new URL(location ?? "", `http://${HOST}`).searchParams.get("oauth");
  return openNotice(token, key, Date.now());
}

// Every variable the handlers read is pinned, so an api-mode shell env does not leak in.
const env = {
  GLOWDERMA_DATA_SOURCE: "mock",
  GLOWDERMA_OAUTH_MODE: "fake",
  GLOWDERMA_GOOGLE_CLIENT_ID: "",
  GLOWDERMA_FACEBOOK_APP_ID: "",
  GLOWDERMA_OAUTH_PROVIDERS: "google,facebook",
  GLOWDERMA_ALLOWED_ORIGINS: HOST,
  GLOWDERMA_INTERNAL_SECRET: SECRET,
  GLOWDERMA_COOKIE_SECURE: "false",
};

beforeEach(() => {
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.mocked(apiOAuthLogin).mockReset();
  vi.mocked(apiOAuthLink).mockReset();
  vi.mocked(apiRefresh).mockReset();
});

function flowCookie(provider: "google" | "facebook", intent: "login" | "link", next = "/admin") {
  const flow = newFlow({ provider, intent, next, nowMs: Date.now() });
  return { flow, cookie: `gd_oauth=${sealFlow(flow, key)}` };
}

describe("GET /admin/auth/oauth/[provider]/start", () => {
  it("seals the flow into a Lax HttpOnly cookie and redirects to the fake authorize page", async () => {
    const response = await start(
      get("/admin/auth/oauth/google/start?next=%2Fadmin%2Forders"),
      ctx("google"),
    );
    expect(response.status).toBe(303);
    const location = new URL(response.headers.get("location") ?? "", `http://${HOST}`);
    expect(location.pathname).toBe("/admin/auth/oauth/google/fake");
    expect(location.searchParams.get("redirect_uri")).toBe(
      `http://${HOST}/admin/auth/oauth/google/callback`,
    );
    expect(location.searchParams.get("code_challenge_method")).toBe("S256");
    const [cookie] = setCookies(response);
    expect(cookie).toMatch(
      /^gd_oauth=[^;]+; Path=\/admin\/auth; .*Max-Age=600; HttpOnly; SameSite=lax$/i,
    );
    expect(cookie).not.toMatch(/Secure/);
  });

  it("puts the S256 challenge of the sealed verifier and the sealed state in the URL", async () => {
    const response = await start(get("/admin/auth/oauth/google/start"), ctx("google"));
    const location = new URL(response.headers.get("location") ?? "", `http://${HOST}`);
    const value = decodeURIComponent(setCookies(response)[0]?.split(";")[0]?.split("=")[1] ?? "");
    const payload = JSON.parse(Buffer.from(value.split(".")[0] ?? "", "base64url").toString());
    expect(location.searchParams.get("state")).toBe(payload.state);
    expect(location.searchParams.get("nonce")).toBe(payload.nonce);
    expect(location.searchParams.get("code_challenge")).toBe(pkceChallenge(payload.verifier));
    expect(payload.next).toBe("/admin");
  });

  it("uses the Secure attribute and the __Secure- prefix behind HTTPS", async () => {
    vi.stubEnv("GLOWDERMA_COOKIE_SECURE", "true");
    const response = await start(get("/admin/auth/oauth/facebook/start"), ctx("facebook"));
    const [cookie] = setCookies(response);
    expect(cookie).toMatch(/^__Secure-gd_oauth=.*; Secure; HttpOnly; SameSite=lax$/i);
    const location = new URL(response.headers.get("location") ?? "", `https://${HOST}`);
    expect(location.searchParams.get("redirect_uri")).toBe(
      `https://${HOST}/admin/auth/oauth/facebook/callback`,
    );
  });

  it("is a 404 for a provider that is not enabled", async () => {
    vi.stubEnv("GLOWDERMA_OAUTH_PROVIDERS", "google");
    expect((await start(get("/admin/auth/oauth/facebook/start"), ctx("facebook"))).status).toBe(
      404,
    );
    expect((await start(get("/admin/auth/oauth/github/start"), ctx("github"))).status).toBe(404);
  });

  it("refuses a link started cross-site or without a session (api mode)", async () => {
    vi.stubEnv("GLOWDERMA_DATA_SOURCE", "api");
    const crossSite = await start(
      get("/admin/auth/oauth/google/start?intent=link", {
        headers: { "sec-fetch-site": "cross-site" },
      }),
      ctx("google"),
    );
    expect(crossSite.headers.get("location")).toBe("/admin/settings");
    expect(setCookies(crossSite)).toEqual([]);
    const anonymous = await start(get("/admin/auth/oauth/google/start?intent=link"), ctx("google"));
    expect(anonymous.headers.get("location")).toBe("/admin/login?next=%2Fadmin%2Fsettings");
  });

  it("redirects live mode to Google with the public client id", async () => {
    vi.stubEnv("GLOWDERMA_OAUTH_MODE", "live");
    vi.stubEnv("GLOWDERMA_GOOGLE_CLIENT_ID", "cid.apps.googleusercontent.com");
    const response = await start(get("/admin/auth/oauth/google/start"), ctx("google"));
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.host).toBe("accounts.google.com");
    expect(location.searchParams.get("client_id")).toBe("cid.apps.googleusercontent.com");
  });
});

describe("GET /admin/auth/oauth/[provider]/fake", () => {
  const query = (extra = "") =>
    `/admin/auth/oauth/google/fake?redirect_uri=${encodeURIComponent(`http://${HOST}/admin/auth/oauth/google/callback`)}&state=abc${extra}`;

  it("renders the form, then returns the fake code to the callback", async () => {
    const page = await fake(get(query()), ctx("google"));
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('name="subject"');
    const done = await fake(
      get(query("&subject=X&email=admin%40glowderma.uz&outcome=ok")),
      ctx("google"),
    );
    expect(done.status).toBe(303);
    const back = new URL(done.headers.get("location") ?? "");
    expect(back.pathname).toBe("/admin/auth/oauth/google/callback");
    expect(back.searchParams.get("code")).toBe("fake:X:admin@glowderma.uz");
    expect(back.searchParams.get("state")).toBe("abc");
  });

  it("maps the failure outcomes to the backend fake's codes and a denial to error=access_denied", async () => {
    const code = async (outcome: string) =>
      new URL(
        (await fake(get(query(`&outcome=${outcome}`)), ctx("google"))).headers.get("location") ??
          "",
      ).searchParams;
    expect((await code("fail")).get("code")).toBe("fake-fail");
    expect((await code("down")).get("code")).toBe("fake-down");
    expect((await code("deny")).get("error")).toBe("access_denied");
  });

  it("refuses a subject or email with a colon, and a foreign redirect_uri", async () => {
    const bad = await fake(get(query("&subject=a%3Ab&email=x%40y.uz&outcome=ok")), ctx("google"));
    expect(bad.status).toBe(400);
    const foreign = await fake(
      get(
        `/admin/auth/oauth/google/fake?redirect_uri=${encodeURIComponent("https://evil.example/cb")}&state=abc`,
      ),
      ctx("google"),
    );
    expect(foreign.status).toBe(400);
  });

  it("is a 404 unless GLOWDERMA_OAUTH_MODE=fake", async () => {
    vi.stubEnv("GLOWDERMA_OAUTH_MODE", "live");
    vi.stubEnv("GLOWDERMA_GOOGLE_CLIENT_ID", "cid");
    expect((await fake(get(query()), ctx("google"))).status).toBe(404);
  });
});

describe("GET /admin/auth/oauth/[provider]/callback", () => {
  it("bounces a cross-site arrival through this origin without consuming anything", async () => {
    const { flow, cookie } = flowCookie("google", "login");
    const response = await callback(
      get(`/admin/auth/oauth/google/callback?code=c&state=${flow.state}`, {
        cookies: cookie,
        headers: { "sec-fetch-site": "cross-site" },
      }),
      ctx("google"),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('http-equiv="refresh"');
    expect(setCookies(response)).toEqual([]);
  });

  it("refuses a wrong state, clears the flow cookie and returns to the login page", async () => {
    const { cookie } = flowCookie("google", "login", "/admin/orders");
    const response = await callback(
      get("/admin/auth/oauth/google/callback?code=c&state=wrong-state", { cookies: cookie }),
      ctx("google"),
    );
    expect(response.status).toBe(303);
    const location = response.headers.get("location") ?? "";
    expect(location).toMatch(/^\/admin\/login\?next=%2Fadmin&oauth=/);
    expect(noticeOf(location)?.message).toBe("Kirish so‘rovi eskirgan. Qayta urinib ko‘ring.");
    expect(setCookies(response).join("\n")).toMatch(/gd_oauth=; Path=\/admin\/auth; Max-Age=0/);
  });

  it("refuses a flow cookie of another provider and a missing cookie", async () => {
    const { flow, cookie } = flowCookie("facebook", "login");
    const other = await callback(
      get(`/admin/auth/oauth/google/callback?code=c&state=${flow.state}`, { cookies: cookie }),
      ctx("google"),
    );
    expect(noticeOf(other.headers.get("location"))?.kind).toBe("error");
    const none = await callback(
      get("/admin/auth/oauth/google/callback?code=c&state=s"),
      ctx("google"),
    );
    expect(none.headers.get("location")).toMatch(/^\/admin\/login/);
  });

  it("lands a mock-mode login on next and a mock-mode link on the account card with a demo notice", async () => {
    const login = flowCookie("google", "login", "/admin/orders");
    const loginResponse = await callback(
      get(`/admin/auth/oauth/google/callback?code=c&state=${login.flow.state}`, {
        cookies: login.cookie,
      }),
      ctx("google"),
    );
    expect(loginResponse.headers.get("location")).toBe("/admin/orders");
    const link = flowCookie("google", "link");
    const linkResponse = await callback(
      get(`/admin/auth/oauth/google/callback?code=c&state=${link.flow.state}`, {
        cookies: link.cookie,
      }),
      ctx("google"),
    );
    expect(noticeOf(linkResponse.headers.get("location"))?.kind).toBe("demo");
  });

  describe("api mode", () => {
    beforeEach(() => {
      vi.stubEnv("GLOWDERMA_DATA_SOURCE", "api");
      vi.stubEnv("GLOWDERMA_API_URL", "http://django.test");
    });

    it("posts the code, verifier, redirect_uri and nonce and sets the session cookies", async () => {
      const exp = Math.floor(Date.now() / 1000) + 900;
      const access = fakeJwt({ exp, sid: "s1" });
      vi.mocked(apiOAuthLogin).mockResolvedValue({
        status: 200,
        headers: new Headers(),
        data: {
          access,
          access_expires_at: new Date(exp * 1000).toISOString(),
          refresh: "r".repeat(43),
          refresh_expires_at: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
          user: {
            id: 1,
            email: "admin@glowderma.uz",
            display_name: "Administrator",
            is_superuser: true,
            linked_providers: ["google"],
            session_expires_at: "2026-10-26T22:00:00+05:00",
          },
        },
      });
      const { flow, cookie } = flowCookie("google", "login", "/admin/payments");
      const response = await callback(
        get(`/admin/auth/oauth/google/callback?code=fake%3AX%3Aa%40b.uz&state=${flow.state}`, {
          cookies: cookie,
        }),
        ctx("google"),
      );
      expect(apiOAuthLogin).toHaveBeenCalledWith("google", {
        code: "fake:X:a@b.uz",
        code_verifier: flow.verifier,
        redirect_uri: `http://${HOST}/admin/auth/oauth/google/callback`,
        nonce: "*",
      });
      expect(response.headers.get("location")).toBe("/admin/payments");
      const cookies = setCookies(response).join("\n");
      expect(cookies).toMatch(
        /gd_admin_access=[^;]+; Path=\/admin; .*Max-Age=\d+; HttpOnly; SameSite=strict/,
      );
      expect(cookies).toMatch(
        /gd_admin_refresh=r{43}; Path=\/admin\/auth; .*Max-Age=\d+; HttpOnly; SameSite=strict/,
      );
      expect(cookies).toMatch(/gd_csrf=[A-Za-z0-9_-]{43}; Path=\/admin/);
      expect(cookies).toMatch(/gd_oauth=; Path=\/admin\/auth; Max-Age=0/);
    });

    it("sends no nonce for Facebook", async () => {
      vi.mocked(apiOAuthLogin).mockRejectedValue(
        new ApiError(401, {
          code: "social_account_not_allowed",
          message: "Bu hisob administrator sifatida ro‘yxatdan o‘tmagan.",
          errors: [],
          request_id: "r",
        }),
      );
      const { flow, cookie } = flowCookie("facebook", "login");
      const response = await callback(
        get(`/admin/auth/oauth/facebook/callback?code=c&state=${flow.state}`, { cookies: cookie }),
        ctx("facebook"),
      );
      expect(vi.mocked(apiOAuthLogin).mock.calls[0]?.[1]).not.toHaveProperty("nonce");
      expect(response.headers.get("location")).toMatch(/^\/admin\/login\?next=%2Fadmin&oauth=/);
      expect(noticeOf(response.headers.get("location"))?.message).toBe(
        "Bu hisob administrator sifatida ro‘yxatdan o‘tmagan.",
      );
      expect(setCookies(response).join("\n")).not.toMatch(/gd_admin_access=[^;]/);
    });

    it("links with the current access token and returns to the account card", async () => {
      vi.mocked(apiOAuthLink).mockResolvedValue({
        status: 200,
        headers: new Headers(),
        data: {} as never,
      });
      const access = fakeJwt({ exp: Math.floor(Date.now() / 1000) + 600, sid: "s1" });
      const { flow, cookie } = flowCookie("google", "link");
      const response = await callback(
        get(`/admin/auth/oauth/google/callback?code=c&state=${flow.state}`, {
          cookies: `${cookie}; gd_admin_access=${access}`,
        }),
        ctx("google"),
      );
      expect(vi.mocked(apiOAuthLink).mock.calls[0]?.[0]).toBe(access);
      expect(noticeOf(response.headers.get("location"))).toMatchObject({
        kind: "linked",
        message: "Google hisobi bog‘landi.",
      });
      expect(response.headers.get("location")).toMatch(/^\/admin\/settings\?oauth=/);
    });

    it("renews a lapsed access token through the refresh cookie before linking", async () => {
      const fresh = fakeJwt({ exp: Math.floor(Date.now() / 1000) + 900, sid: "s1" });
      vi.mocked(apiRefresh).mockResolvedValue({
        status: 200,
        headers: new Headers(),
        data: {
          access: fresh,
          access_expires_at: new Date(Date.now() + 900_000).toISOString(),
          refresh_expires_at: new Date(Date.now() + 3600_000).toISOString(),
        },
      });
      vi.mocked(apiOAuthLink).mockResolvedValue({
        status: 200,
        headers: new Headers(),
        data: {} as never,
      });
      const { flow, cookie } = flowCookie("google", "link");
      const response = await callback(
        get(`/admin/auth/oauth/google/callback?code=c&state=${flow.state}`, {
          cookies: `${cookie}; gd_admin_refresh=${"r".repeat(43)}`,
        }),
        ctx("google"),
      );
      expect(apiRefresh).toHaveBeenCalledWith("r".repeat(43));
      expect(vi.mocked(apiOAuthLink).mock.calls[0]?.[0]).toBe(fresh);
      expect(setCookies(response).join("\n")).toMatch(/gd_admin_access=/);
    });

    it("shows a link conflict on the account card with the backend's message", async () => {
      vi.mocked(apiOAuthLink).mockRejectedValue(
        new ApiError(409, {
          code: "conflict",
          message: "Bu ijtimoiy hisob allaqachon bog‘langan.",
          errors: [],
          request_id: "r",
        }),
      );
      const access = fakeJwt({ exp: Math.floor(Date.now() / 1000) + 600, sid: "s1" });
      const { flow, cookie } = flowCookie("google", "link");
      const response = await callback(
        get(`/admin/auth/oauth/google/callback?code=c&state=${flow.state}`, {
          cookies: `${cookie}; gd_admin_access=${access}`,
        }),
        ctx("google"),
      );
      expect(response.headers.get("location")).toMatch(/^\/admin\/settings\?oauth=/);
      expect(noticeOf(response.headers.get("location"))?.message).toBe(
        "Bu ijtimoiy hisob allaqachon bog‘langan.",
      );
    });

    it("sends a link without any session to the login page and clears the cookies", async () => {
      const { flow, cookie } = flowCookie("google", "link");
      const response = await callback(
        get(`/admin/auth/oauth/google/callback?code=c&state=${flow.state}`, { cookies: cookie }),
        ctx("google"),
      );
      expect(apiOAuthLink).not.toHaveBeenCalled();
      expect(response.headers.get("location")).toMatch(
        /^\/admin\/login\?next=%2Fadmin%2Fsettings&oauth=/,
      );
      expect(setCookies(response).join("\n")).toMatch(/gd_admin_access=; Path=\/admin; Max-Age=0/);
    });
  });
});
