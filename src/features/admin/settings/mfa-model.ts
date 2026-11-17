/**
 * Pure helpers of the Settings MFA card (DESIGN §E "MFA"), unit-tested.
 */

/**
 * The account an `otpauth://totp/<issuer>:<account>?…` URI names (what the authenticator app will
 * list), or `null` for anything else. Read locally: the URI never leaves the browser.
 */
export function otpauthAccount(uri: string): string | null {
  if (!uri.startsWith("otpauth://totp/")) return null;
  const rest = uri.slice("otpauth://totp/".length);
  const label = rest.split("?")[0] ?? "";
  let decoded: string;
  try {
    decoded = decodeURIComponent(label);
  } catch {
    return null;
  }
  const colon = decoded.indexOf(":");
  const account = (colon === -1 ? decoded : decoded.slice(colon + 1)).trim();
  return account || null;
}

/** The manual key without the grouping spaces (what the clipboard gets). */
export function compactKey(manualKey: string): string {
  return manualKey.replace(/\s+/g, "");
}

export interface RecoveryFileTexts {
  fileTitle: string;
  fileAccount: (account: string) => string;
  fileNote: string;
}

/**
 * The recovery codes as a plain-text file (one per line, numbered), with a title, the account and
 * a note. CRLF line ends, so Notepad shows the lines too.
 */
export function recoveryCodesFile(
  codes: ReadonlyArray<string>,
  texts: RecoveryFileTexts,
  account: string | null,
  createdAt: string,
): string {
  const lines = [texts.fileTitle];
  if (account) lines.push(texts.fileAccount(account));
  lines.push(createdAt, "");
  codes.forEach((code, index) => lines.push(`${String(index + 1).padStart(2, " ")}. ${code}`));
  lines.push("", texts.fileNote, "");
  return lines.join("\r\n");
}

/** The codes for the clipboard: one per line. */
export function recoveryCodesClipboard(codes: ReadonlyArray<string>): string {
  return codes.join("\n");
}
