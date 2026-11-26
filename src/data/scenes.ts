import "server-only";

import { SCENES_OFF, type SceneStatus, type SceneTemplate } from "@/domain/scene";

import { mapSceneStatus, mapSceneTemplates } from "./api/mappers/scenes";
import { apiSceneStatus, apiSceneTemplates } from "./api/scenes";
import { requireApiToken } from "./auth";
import { getSceneTemplates as mockTemplates, MOCK_SCENE_STATUS } from "./mock/scenes";
import { dataSource } from "./source";

/**
 * `GET scenes/status/` and `GET scenes/templates/` (admin contract §2.20) for the product editor.
 * A failed read switches scenes off (every scene action hidden) instead of failing the editor;
 * manual cropping stays.
 */
export async function getSceneSetup(): Promise<{
  status: SceneStatus;
  templates: SceneTemplate[];
}> {
  if ((await dataSource()) !== "api") {
    return { status: MOCK_SCENE_STATUS, templates: await mockTemplates() };
  }
  const token = await requireApiToken();
  try {
    const { data } = await apiSceneStatus(token);
    const status = mapSceneStatus(data);
    if (!status.enabled) return { status, templates: [] };
    const templates = mapSceneTemplates((await apiSceneTemplates(token)).data.results ?? []);
    return { status, templates };
  } catch (error) {
    console.warn("[data] scene status unavailable", error instanceof Error ? error.message : "");
    return { status: SCENES_OFF, templates: [] };
  }
}
