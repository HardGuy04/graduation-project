import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group relative inline-flex select-none items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full font-semibold text-sm transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-tertiary",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-card text-foreground hover:border-accent/50 hover:bg-tile",
        secondary:
          "bg-secondary-strong text-white hover:bg-tertiary",
        accent:
          "bg-accent text-accent-foreground hover:bg-accent/90",
        frost:
          "border border-white/70 bg-white/60 text-foreground backdrop-blur-sm hover:bg-white/85",
        inverted:
          "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:bg-tile",
        tile:
          "bg-tile text-foreground hover:bg-tile-strong",
        ghost:
          "text-foreground hover:bg-tile",
        "ghost-danger":
          "text-destructive hover:bg-destructive/10",
        link: "h-auto px-0 text-foreground underline-offset-4 hover:underline",
        shimmer:
          "relative animate-shimmer border border-slate-800/50 bg-[length:200%_100%] bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] text-white shadow-2xl shadow-primary/30 before:absolute before:inset-0 before:translate-x-[-200%] before:animate-shimmer-slide before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent hover:scale-[1.02] hover:shadow-primary/50 active:scale-[0.98]",
        glow: "relative animate-gradient-x bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50 before:absolute before:inset-[-2px] before:-z-10 before:rounded-xl before:bg-gradient-to-r before:from-violet-600 before:via-purple-600 before:to-fuchsia-600 before:opacity-75 before:blur-md hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/60 active:scale-[0.98]",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-11 px-4 text-[13px]",
        lg: "h-12 px-8 text-base",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Spinner() {
  return (
    <svg className="animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, loading = false, disabled, type = "button", children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const handleMouseMove = (e) => {
      const { left, top } = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - left);
      mouseY.set(e.clientY - top);
    };

    const background = useMotionTemplate`radial-gradient(circle at ${mouseX}px ${mouseY}px, rgba(255,255,255,0.15), transparent 80%)`;

    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size }), className)}
          ref={ref}
          {...props}>
          {children}
        </Comp>
      );
    }

    const MotionButton = motion.button;
    const darkSurface = !variant || ["default", "destructive", "secondary", "accent"].includes(variant);

    return (
      <MotionButton
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        onMouseMove={handleMouseMove}
        whileHover={{ scale: variant === "link" ? 1 : 1.02 }}
        whileTap={{ scale: variant === "link" ? 1 : 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        {...(props)}>
        {darkSurface && (
          <motion.div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background }} />
        )}
        <span className="relative z-10 flex items-center justify-center gap-2">
          {loading && <Spinner />}
          {children}
        </span>
      </MotionButton>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
