import clsx from "clsx";
import { forwardRef } from "react";

export function Label({ children, required, className }) {
  return (
    <label className={clsx("block text-sm font-semibold text-ink mb-1.5", className)}>
      {children}
      {required && <span className="text-clay-500 ml-0.5">*</span>}
    </label>
  );
}

export const Input = forwardRef(function Input({ className, error, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={clsx(
        "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-300",
        "outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100",
        error ? "border-clay-400" : "border-slate-200",
        className
      )}
      {...props}
    />
  );
});

export const Select = forwardRef(function Select({ className, error, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={clsx(
        "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-ink",
        "outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100",
        error ? "border-clay-400" : "border-slate-200",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export const Textarea = forwardRef(function Textarea({ className, error, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={clsx(
        "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-300",
        "outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 resize-none",
        error ? "border-clay-400" : "border-slate-200",
        className
      )}
      {...props}
    />
  );
});

export function FieldError({ children }) {
  if (!children) return null;
  return <p className="mt-1 text-xs font-medium text-clay-500">{children}</p>;
}

export function FormRow({ label, required, error, children, hint }) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
      <FieldError>{error}</FieldError>
    </div>
  );
}
