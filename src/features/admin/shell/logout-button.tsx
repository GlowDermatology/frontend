import { IconButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

/**
 * Posts to the logout route handler. Works without JavaScript; the hidden
 * `csrf` field echoes the readable `gd_csrf` cookie (double-submit).
 */
export function LogoutButton({ csrf }: { csrf: string }) {
  return (
    <form method="post" action="/admin/auth/logout" className="contents">
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="scope" value="current" />
      <IconButton type="submit" aria-label="Chiqish" variant="ghost">
        <Icon name="logout" size={20} />
      </IconButton>
    </form>
  );
}
