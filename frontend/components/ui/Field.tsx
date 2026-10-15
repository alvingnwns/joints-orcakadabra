import { type ComponentProps, type ReactNode, useId } from "react";

import { cn } from "@/lib/cn";

const CONTROL =
  "min-w-0 max-w-full rounded-control border border-border-strong bg-surface text-text disabled:opacity-50 aria-[invalid=true]:border-danger";

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(CONTROL, "min-h-11 w-full px-3", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cn(CONTROL, "w-full p-3", className)} {...rest} />;
}

/** Full width by default; `inline` sizes it to its content (e.g. the language switcher). */
export function Select({
  inline = false,
  className,
  ...rest
}: ComponentProps<"select"> & { inline?: boolean }) {
  return (
    <select
      className={cn(CONTROL, "min-h-11 px-3", inline ? "w-auto max-w-full" : "w-full", className)}
      {...rest}
    />
  );
}

/** What a control needs to be tied to its label, hint and error message. */
export type FieldControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

type FieldProps = {
  label: ReactNode;
  /** Short help shown under the label, always visible. */
  hint?: ReactNode;
  /** Validation message. Announced to screen readers when it appears. */
  error?: ReactNode;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
};

/**
 * A label, optional hint and error, wired to one control with the right ids and aria attributes:
 *
 *   <Field label="Title" error={error}>{(control) => <Input {...control} />}</Field>
 */
export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ");

  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="mt-1 text-sm text-text-secondary">
          {hint}
        </p>
      )}
      <div className="mt-1">
        {children({
          id,
          ...(describedBy && { "aria-describedby": describedBy }),
          ...(error && { "aria-invalid": true as const }),
        })}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-sm font-medium text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}
