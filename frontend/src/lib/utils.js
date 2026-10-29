import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Khai báo các token tự đặt trong tailwind.config.js để twMerge xử lý đúng xung đột
// (vd. `rounded-full rounded-card`, `text-display-md text-foreground`).
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      rounded: [{ rounded: ["field", "card", "tile"] }],
      "font-size": [{ text: ["display-lg", "display-md", "headline", "title"] }],
      shadow: [{ shadow: ["float", "hairline"] }],
    },
  },
});

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
