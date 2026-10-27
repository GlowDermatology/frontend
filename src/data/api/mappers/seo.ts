import { fillSeo, type SeoStatus, type SeoTexts } from "@/domain/seo";

import type { Schemas } from "../types";

/** `seo` / `seo_status` (B-W1, contract §2.3, §2.4) → the FE domain types. */

export function mapSeo(api: Schemas["SeoTexts"] | null | undefined): SeoTexts {
  return fillSeo(api);
}

/** A missing `seo_status` (a backend before B-W1) reads as an empty, passing checklist. */
export function mapSeoStatus(api: Schemas["SeoStatus"] | null | undefined): SeoStatus {
  if (!api) return { ok: true, issues: [] };
  return {
    ok: api.ok,
    issues: api.issues.map((issue) => ({
      code: issue.code,
      severity: issue.severity,
      language: issue.language ?? null,
      message: issue.message,
    })),
  };
}
