import { useCallback, useEffect, useState } from "react";

/**
 * For the forms that keep their errors in local state (React Hook Form forms
 * use `setError(…, { shouldFocus })`): `focusFirstInvalid(form)` moves focus
 * to the first field marked `aria-invalid="true"` inside `form` once React
 * has committed the errors set in the same update. Without an invalid field,
 * focus stays where it is: the form-level message is a live `role="alert"`.
 */
export function useFocusFirstInvalid(): (form: HTMLElement | null | undefined) => void {
  const [request, setRequest] = useState<{ form: HTMLElement } | null>(null);
  useEffect(() => {
    request?.form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [request]);
  return useCallback((form) => {
    if (form) setRequest({ form });
  }, []);
}
