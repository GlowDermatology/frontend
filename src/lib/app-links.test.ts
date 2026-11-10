import { describe, expect, it } from "vitest";

import {
  androidFingerprints,
  androidPackage,
  appReturnUrl,
  appleAppIds,
  appleAppSiteAssociation,
  assetLinks,
  returnOrderId,
  wellKnownResponse,
} from "./app-links";

const FP = Array.from({ length: 32 }, () => "AB").join(":");

describe("app links", () => {
  it("keeps only valid Apple app ids", () => {
    expect(appleAppIds(" ABCDE12345.uz.glowderma.app , bad, abc.uz.x ")).toEqual([
      "ABCDE12345.uz.glowderma.app",
    ]);
    expect(appleAppIds(undefined)).toEqual([]);
  });

  it("normalises and validates fingerprints", () => {
    expect(androidFingerprints(`${FP.toLowerCase()}, AA:BB`)).toEqual([FP]);
  });

  it("defaults the Android package and rejects junk", () => {
    expect(androidPackage(undefined)).toBe("uz.glowderma.app");
    expect(androidPackage("not a package")).toBeNull();
  });

  it("builds the Apple document only when configured", () => {
    expect(appleAppSiteAssociation([])).toBeNull();
    expect(appleAppSiteAssociation(["ABCDE12345.uz.glowderma.app"])).toEqual({
      applinks: {
        details: [
          {
            appIDs: ["ABCDE12345.uz.glowderma.app"],
            components: [{ "/": "/pay/return", comment: "Payment provider return" }],
          },
        ],
      },
    });
  });

  it("builds the Android document only when configured", () => {
    expect(assetLinks("uz.glowderma.app", [])).toBeNull();
    expect(assetLinks(null, [FP])).toBeNull();
    expect(assetLinks("uz.glowderma.app", [FP])).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "uz.glowderma.app",
          sha256_cert_fingerprints: [FP],
        },
      },
    ]);
  });

  it("accepts digit order ids only", () => {
    expect(returnOrderId("10248")).toBe("10248");
    expect(returnOrderId(["10248", "1"])).toBe("10248");
    expect(returnOrderId("10248x")).toBeNull();
    expect(returnOrderId("javascript:alert(1)")).toBeNull();
    expect(returnOrderId(undefined)).toBeNull();
    expect(appReturnUrl("10248")).toBe("glowderma://payment/return?order_id=10248");
    expect(appReturnUrl(null)).toBe("glowderma://payment/return");
  });

  it("answers 404 until configured and JSON afterwards", async () => {
    const missing = wellKnownResponse(null);
    expect(missing.status).toBe(404);
    const ok = wellKnownResponse({ a: 1 });
    expect(ok.status).toBe(200);
    expect(ok.headers.get("Content-Type")).toBe("application/json");
    expect(await ok.json()).toEqual({ a: 1 });
  });
});
