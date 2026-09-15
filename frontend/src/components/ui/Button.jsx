import clsx from "clsx";
import { forwardRef } from "react";

const VARIANTS = {
  primary: "bg-teal-500 text-white hover:bg-teal-600 shadow-soft disabled:bg-slate-200 disabled:text-slate-400",
  secondary: "bg-white text-ink border border-slate-200 hover:border-teal-300 hover:text-teal-600",
  ghost: "text-ink-soft hover:bg-slate-100",
  danger: "bg-clay-500 text-white hover:bg-clay-600 disabled:bg-slate-200 disabled:text-slate-400",
  gold: "bg-gold-400 text-ink hover:bg-gold-500",
  link: "text-teal-600 hover:text-teal-700 underline-offset-4 hover:underline px-0",
};

const SIZES = {
  sm: "text-sm px-3 py-1.5 gap-1.5",
  md: "text-sm px-4 py-2.5 gap-2",
  lg: "text-base px-6 py-3 gap-2",
};

const Button = forwardRef(function Button(
  { variant = "primary", size = "md", className, children, loading, disabled, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center rounded-full font-semibold transition-all duration-150 disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </button>
  );
});

export default Button;
