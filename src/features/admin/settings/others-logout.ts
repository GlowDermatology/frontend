/**
 * The outcome the logout route reports after "Boshqa qurilmalardan chiqish"
 * (`/admin/settings?others=ok|failed`), as the toast the account card shows,
 * and the same URL without the flag so a reload does not repeat it.
 */
export interface OthersLogoutNotice {
  toast: { tone: "success" | "info"; title: string; description: string };
  cleanUrl: string;
}

export function othersLogoutNotice(href: string): OthersLogoutNotice | null {
  const url = new URL(href);
  const outcome = url.searchParams.get("others");
  if (outcome !== "ok" && outcome !== "failed") return null;
  url.searchParams.delete("others");
  const cleanUrl = `${url.pathname}${url.search}${url.hash}`;
  return {
    cleanUrl,
    toast:
      outcome === "ok"
        ? {
            tone: "success",
            title: "Boshqa qurilmalardan chiqildi",
            description: "Boshqa brauzer va qurilmalardagi sessiyalar yakunlandi.",
          }
        : {
            tone: "info",
            title: "Boshqa qurilmalardan chiqib bo‘lmadi",
            description: "Sessiyalar hali ochiq. Birozdan so‘ng qayta urinib ko‘ring.",
          },
  };
}
