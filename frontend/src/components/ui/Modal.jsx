import { AppDialog } from "../app/Dialog";

const SIZE_BY_WIDTH = { "max-w-sm": "sm", "max-w-md": "md", "max-w-lg": "md", "max-w-xl": "lg", "max-w-2xl": "lg" };

export default function Modal({ open, onClose, title, subtitle, children, width = "max-w-lg" }) {
  return (
    <AppDialog open={!!open} onClose={onClose} title={title} description={subtitle} size={SIZE_BY_WIDTH[width] || "md"}>
      {children}
    </AppDialog>
  );
}
