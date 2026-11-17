import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { copyFor } from "@/lib/i18n/admin-locale";

import { passwordCopy } from "./copy";

/**
 * «Boshqa hisob bilan kirish»: signs this session out (the logout route handler, double-submit
 * csrf) so someone else can sign in. Works without JavaScript.
 */
export async function OtherAccountForm({ csrf }: { csrf: string }) {
  const t = await copyFor(passwordCopy);
  return (
    <form method="post" action="/admin/auth/logout" className="flex justify-center">
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="scope" value="current" />
      <button type="submit" className={buttonStyles({ variant: "ghost", size: "sm" })}>
        <Icon name="logout" size={16} />
        {t.change.otherAccount}
      </button>
    </form>
  );
}
