import { forwardRef, useId, cloneElement, isValidElement } from "react";
import { HiOutlineSearch } from "react-icons/hi";
import { cn } from "@/lib/utils";

export const control =
  "w-full min-h-11 border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground/80 transition-colors " +
  "hover:border-accent/50 focus-visible:border-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
  "disabled:cursor-not-allowed disabled:bg-tile disabled:text-muted-foreground";

const tone = (error) => (error ? "border-destructive" : "border-input");

export function Label({ htmlFor, children, required, className }) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 block text-sm font-semibold text-foreground", className)}>
      {children}
      {required && <span className="ml-0.5 text-destructive" aria-hidden>*</span>}
    </label>
  );
}

export const Input = forwardRef(function Input({ className, error, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={error ? true : undefined}
      className={cn(control, "rounded-field py-2.5", tone(error), className)}
      {...props}
    />
  );
});

export const Select = forwardRef(function Select({ className, error, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={error ? true : undefined}
      className={cn(control, "rounded-field py-2.5 pr-10 appearance-none bg-no-repeat", tone(error), className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23000'%3E%3Cpath d='M5.5 7.5 10 12l4.5-4.5'  stroke='%23000' stroke-width='1.6' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 0.9rem center",
        backgroundSize: "1.1rem",
      }}
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
      aria-invalid={error ? true : undefined}
      className={cn(control, "rounded-field py-3 resize-none", tone(error), className)}
      {...props}
    />
  );
});

/** Ô tìm kiếm dạng pill theo Auralis. */
export const SearchInput = forwardRef(function SearchInput({ className, label = "Tìm kiếm", ...props }, ref) {
  return (
    <div className={cn("relative", className)}>
      <HiOutlineSearch aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
      <input
        ref={ref}
        type="search"
        aria-label={label}
        className={cn(control, "rounded-full py-2.5 pl-11 border-input")}
        {...props}
      />
    </div>
  );
});

export function FieldError({ id, children }) {
  if (!children) return null;
  return <p id={id} role="alert" className="mt-1.5 text-xs font-medium text-destructive">{children}</p>;
}

/** Gắn id/aria-describedby cho control con để label + lỗi được đọc đúng. */
export function FormRow({ label, required, error, hint, children, className }) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  const child = isValidElement(children)
    ? cloneElement(children, { id: children.props.id || id, "aria-describedby": describedBy, error: children.props.error ?? !!error })
    : children;
  return (
    <div className={className}>
      <Label htmlFor={id} required={required}>{label}</Label>
      {child}
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      <FieldError id={`${id}-err`}>{error}</FieldError>
    </div>
  );
}
