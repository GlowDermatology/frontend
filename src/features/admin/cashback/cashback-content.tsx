import { requireStaff } from "@/data/auth";
import { getCashbackSettings } from "@/data/cashback";

import { CashbackEditor } from "./cashback-editor";

export async function CashbackContent() {
  await requireStaff();
  const settings = await getCashbackSettings();
  return (
    <CashbackEditor
      policy={settings.policy}
      versions={settings.versions}
      nextEffectiveFrom={settings.nextEffectiveFrom}
    />
  );
}
