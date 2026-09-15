import clsx from "clsx";
import { getInitials } from "../../utils/formatters";

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-24 w-24 text-2xl",
};

export default function Avatar({ name, color = "#0F5C56", size = "md", src, className }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        title={name}
        className={clsx("rounded-full object-cover shrink-0", SIZES[size], className)}
      />
    );
  }
  return (
    <div
      className={clsx("flex items-center justify-center rounded-full font-bold text-white shrink-0 font-display", SIZES[size], className)}
      style={{ backgroundColor: color }}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}
