import { cn } from "@/lib/cn";

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

interface AvatarProps {
  name: string;
  size?: number;
  className?: string;
}

/** Initials on gold-soft; decorative because the name is always shown next to it. */
export function Avatar({ name, size = 36, className }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gold-soft text-[13px] font-bold text-ink",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
