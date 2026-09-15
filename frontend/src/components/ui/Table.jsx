import clsx from "clsx";

export function TableShell({ children }) {
  return (
    <div className="overflow-x-auto rounded-xl2 border border-slate-100 bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }) {
  return (
    <th className={clsx("px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-faint bg-slate-50/80 first:rounded-tl-xl2 last:rounded-tr-xl2", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }) {
  return <td className={clsx("px-4 py-3.5 align-middle text-ink", className)}>{children}</td>;
}

export function Tr({ children, className, ...props }) {
  return (
    <tr className={clsx("border-t border-slate-100 hover:bg-teal-50/40 transition-colors", className)} {...props}>
      {children}
    </tr>
  );
}
