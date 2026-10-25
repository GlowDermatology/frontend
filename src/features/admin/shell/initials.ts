/**
 * Sidebar avatar initials (contract §5.7): the first letters of the first two
 * words, else the first two letters, uppercased ("Administrator" → "AD",
 * "Malika Yusupova" → "MY").
 */
export function staffInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0];
  if (!first) return "";
  const second = words[1];
  const letters = second ? `${first.charAt(0)}${second.charAt(0)}` : first.slice(0, 2);
  return letters.toUpperCase();
}
