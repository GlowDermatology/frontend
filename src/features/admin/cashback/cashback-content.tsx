import { getCashbackSettings } from "@/data/cashback";

import { CashbackEditor } from "./cashback-editor";

export async function CashbackContent() {
  const settings = await getCashbackSettings();
  return (
    <CashbackEditor
      policy={settings.policy}
      versions={settings.versions}
      nextEffectiveFrom={settings.nextEffectiveFrom}
    />
  );
}
