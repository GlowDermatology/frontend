import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

interface ReorderButtonsProps {
  /** Accessible subject, e.g. "«Serumlar»". */
  subject: string;
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  disabled?: boolean;
}

const buttonClass =
  "flex size-8 items-center justify-center rounded-sm text-ink-muted transition-colors duration-150 hover:bg-gold-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-muted";

/**
 * Up/down controls of an ordered row (categories, banners): a keyboard and
 * single-pointer alternative to dragging, one `PUT …/order/` per press.
 */
export function ReorderButtons({ subject, index, count, onMove, disabled }: ReorderButtonsProps) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="w-6 text-right text-body-sm text-ink-muted tabular-nums">{index + 1}</span>
      <span className="ml-1 flex flex-col">
        <button
          type="button"
          aria-label={`${subject} yuqoriga`}
          disabled={disabled || index === 0}
          onClick={() => onMove(index, index - 1)}
          className={cn(buttonClass, "h-5")}
        >
          <Icon name="chevron-up" size={16} />
        </button>
        <button
          type="button"
          aria-label={`${subject} pastga`}
          disabled={disabled || index === count - 1}
          onClick={() => onMove(index, index + 1)}
          className={cn(buttonClass, "h-5")}
        >
          <Icon name="chevron-down" size={16} />
        </button>
      </span>
    </span>
  );
}
