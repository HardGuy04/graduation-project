import { forwardRef } from "react";
import { Button as KitButton } from "@/components/kit/button";

const VARIANTS = {
  primary: "default",
  secondary: "outline",
  ghost: "ghost",
  danger: "destructive",
  gold: "tile",
  link: "link",
};

const SIZES = { sm: "sm", md: "default", lg: "lg" };

/** Giữ API cũ (variant primary/secondary/…, size sm/md/lg) nhưng render nút JolyUI. */
const Button = forwardRef(function Button({ variant = "primary", size = "md", ...props }, ref) {
  return <KitButton ref={ref} variant={VARIANTS[variant] || variant} size={SIZES[size] || size} {...props} />;
});

export default Button;
