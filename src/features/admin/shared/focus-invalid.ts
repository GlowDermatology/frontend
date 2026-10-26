/**
 * Moves focus to the first field marked `aria-invalid="true"` inside
 * `container` once React has rendered the new errors (next frame), for the
 * forms that keep their errors in local state (React Hook Form forms use
 * `setError(…, { shouldFocus })`). Without an invalid field, focus stays
 * where it is: the form-level message is a live `role="alert"`.
 */
export function focusFirstInvalid(container: HTMLElement | null | undefined): void {
  if (!container) return;
  requestAnimationFrame(() => {
    container.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });
}
