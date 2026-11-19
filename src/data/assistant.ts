import "server-only";

import type { AssistantStatus } from "@/domain/assistant";

import { apiAssistantStatus } from "./api/assistant";
import { requireApiToken } from "./auth";
import { MOCK_ASSISTANT_STATUS } from "./mock/assistant";
import { dataSource } from "./source";

/**
 * `GET /api/v1/admin/assistant/status/` (contract §2.19): whether the product editor shows the
 * AI assistant. A failed read hides the button instead of failing the editor.
 */
export async function getAssistantStatus(): Promise<AssistantStatus> {
  if ((await dataSource()) !== "api") return MOCK_ASSISTANT_STATUS;
  const token = await requireApiToken();
  try {
    const { data } = await apiAssistantStatus(token);
    return { enabled: data.enabled, maxImages: data.max_images };
  } catch (error) {
    console.warn(
      "[data] assistant status unavailable",
      error instanceof Error ? error.message : "",
    );
    return { enabled: false, maxImages: 0 };
  }
}
