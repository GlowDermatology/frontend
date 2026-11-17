"use client";

import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
  type UseControllerProps,
} from "react-hook-form";

import { DatePicker, type DatePickerProps } from "./date-picker";
import { DateTimePicker, type DateTimePickerProps } from "./date-time-picker";
import { PhoneInput, type PhoneInputProps } from "./phone-input";
import { Select, type SelectProps } from "./select";
import { TimePicker, type TimePickerProps } from "./time-picker";

/**
 * React Hook Form bindings for the kit's custom controls. Each one is a `useController` wrapper:
 * the field's value, `onChange`, `onBlur`, `name` and `ref` (so `setFocus` and the error reveal
 * reach the control) are wired for you; everything else is the control's own props. Use them
 * inside `Field` and spread its control props:
 *
 * ```tsx
 * <Field label={t.startsAt} error={errors.startsAt?.message}>
 *   {(control) => <FormDateTimePicker {...control} control={form.control} name="startsAt" />}
 * </Field>
 * ```
 *
 * The form values are strings: `""` for nothing, `YYYY-MM-DD`, `HH:MM`, `YYYY-MM-DDTHH:MM`, the
 * phone as `+998…`, the select's option value.
 */

type ControllerProps<TValues extends FieldValues, TName extends FieldPath<TValues>> = Pick<
  UseControllerProps<TValues, TName>,
  "name" | "rules" | "shouldUnregister" | "defaultValue" | "disabled"
> & {
  control: Control<TValues>;
};

/** Props a wrapper takes over from the control. */
type Wired = "value" | "defaultValue" | "onValueChange" | "onBlur" | "name" | "ref" | "disabled";

function useStringField<TValues extends FieldValues, TName extends FieldPath<TValues>>(
  props: ControllerProps<TValues, TName>,
) {
  const { field } = useController({
    control: props.control,
    name: props.name,
    rules: props.rules,
    shouldUnregister: props.shouldUnregister,
    defaultValue: props.defaultValue,
    disabled: props.disabled,
  });
  return {
    name: field.name,
    value: typeof field.value === "string" ? field.value : "",
    onValueChange: (next: string) => field.onChange(next),
    onBlur: field.onBlur,
    ref: field.ref,
    disabled: field.disabled,
  };
}

export type FormDatePickerProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
> = ControllerProps<TValues, TName> & Omit<DatePickerProps, Wired>;

/** `DatePicker` bound to a form field holding `YYYY-MM-DD` or "". */
export function FormDatePicker<TValues extends FieldValues, TName extends FieldPath<TValues>>({
  control,
  name,
  rules,
  shouldUnregister,
  defaultValue,
  disabled,
  ...rest
}: FormDatePickerProps<TValues, TName>) {
  const field = useStringField({ control, name, rules, shouldUnregister, defaultValue, disabled });
  return <DatePicker {...rest} {...field} />;
}

export type FormTimePickerProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
> = ControllerProps<TValues, TName> & Omit<TimePickerProps, Wired>;

/** `TimePicker` bound to a form field holding `HH:MM` or "". */
export function FormTimePicker<TValues extends FieldValues, TName extends FieldPath<TValues>>({
  control,
  name,
  rules,
  shouldUnregister,
  defaultValue,
  disabled,
  ...rest
}: FormTimePickerProps<TValues, TName>) {
  const field = useStringField({ control, name, rules, shouldUnregister, defaultValue, disabled });
  return <TimePicker {...rest} {...field} />;
}

export type FormDateTimePickerProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
> = ControllerProps<TValues, TName> & Omit<DateTimePickerProps, Wired>;

/** `DateTimePicker` bound to a form field holding `YYYY-MM-DDTHH:MM` or "". */
export function FormDateTimePicker<TValues extends FieldValues, TName extends FieldPath<TValues>>({
  control,
  name,
  rules,
  shouldUnregister,
  defaultValue,
  disabled,
  ...rest
}: FormDateTimePickerProps<TValues, TName>) {
  const field = useStringField({ control, name, rules, shouldUnregister, defaultValue, disabled });
  return <DateTimePicker {...rest} {...field} />;
}

export type FormPhoneInputProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
> = ControllerProps<TValues, TName> & Omit<PhoneInputProps, Wired>;

/** `PhoneInput` bound to a form field holding `+998…` (E.164 when complete) or "". */
export function FormPhoneInput<TValues extends FieldValues, TName extends FieldPath<TValues>>({
  control,
  name,
  rules,
  shouldUnregister,
  defaultValue,
  disabled,
  ...rest
}: FormPhoneInputProps<TValues, TName>) {
  const field = useStringField({ control, name, rules, shouldUnregister, defaultValue, disabled });
  return <PhoneInput {...rest} {...field} />;
}

export type FormSelectProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
  T extends string = string,
> = ControllerProps<TValues, TName> & Omit<SelectProps<T>, Wired>;

/** `Select` bound to a form field holding one of the options' values. */
export function FormSelect<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
  T extends string = string,
>({
  control,
  name,
  rules,
  shouldUnregister,
  defaultValue,
  disabled,
  ...rest
}: FormSelectProps<TValues, TName, T>) {
  const { value, ...wired } = useStringField({
    control,
    name,
    rules,
    shouldUnregister,
    defaultValue,
    disabled,
  });
  return <Select<T> {...rest} {...wired} value={value as T} />;
}
