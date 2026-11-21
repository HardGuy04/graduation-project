import { Dialog as DialogPrimitive } from "@animate-ui/react/primitives/radix-ui";
import { HiX } from "react-icons/hi";
import { Button } from "@/components/kit/button";
import { cn } from "@/lib/utils";

const SIZES = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

export function AppDialog({ open, onClose, title, description, size = "md", children, footer }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => { if (!v) onClose?.(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          onInteractOutside={(e) => {
            if (e.target instanceof Element && e.target.closest('[data-slot="combobox-content"]')) e.preventDefault();
          }}
          className={cn(
            "auralis fixed inset-0 z-50 m-auto flex h-fit max-h-[88vh] w-[calc(100%-2rem)] flex-col overflow-hidden rounded-card border border-border bg-card shadow-float",
            SIZES[size]
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-title text-foreground">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">{description}</DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="tile" size="icon" aria-label="Đóng" className="-mr-2 -mt-1 shrink-0">
                <HiX />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <div className="overflow-y-auto scrollbar-thin px-6 py-5">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2.5 border-t border-border px-6 py-4">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = "Xác nhận", cancelLabel = "Quay lại", danger, loading }) {
  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{cancelLabel}</Button>
          <Button variant={danger ? "destructive" : "default"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">{description}</p>
    </AppDialog>
  );
}
