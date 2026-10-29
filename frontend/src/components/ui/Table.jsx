import { cn } from "@/lib/utils";

export function TableShell({ children, className }) {
  return (
    <div className={cn("overflow-x-auto scrollbar-thin rounded-card border border-border bg-card shadow-hairline", className)}>
      <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }) {
  return (
    <th scope="col" className={cn("bg-tile/60 px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className, ...props }) {
  return <td className={cn("px-4 py-3.5 align-middle text-foreground", className)} {...props}>{children}</td>;
}

export function Tr({ children, className, ...props }) {
  return (
    <tr className={cn("border-t border-border transition-colors hover:bg-tile/50", className)} {...props}>
      {children}
    </tr>
  );
}
