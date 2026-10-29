"use client"

// shadcn/ui Combobox (registry new-york-v4) trên @base-ui/react.
// Chuyển sang JSX + cú pháp Tailwind v3; InputGroup được thay bằng ô nhập của dự án.
import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react"
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react"

import { Button } from "@/components/kit/button"
import { control as fieldControl } from "@/components/app/Field"
import { cn } from "@/lib/utils"

const Combobox = ComboboxPrimitive.Root

function ComboboxValue({ ...props }) {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />
}

function ComboboxTrigger({ className, children, ...props }) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      render={<Button variant="ghost" size="icon" />}
      className={cn("h-9 w-9 text-muted-foreground", className)}
      {...props}
    >
      {children}
      <ChevronDownIcon data-slot="combobox-trigger-icon" className="pointer-events-none size-4" />
    </ComboboxPrimitive.Trigger>
  )
}

function ComboboxClear({ className, ...props }) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      render={<Button variant="ghost" size="icon" />}
      className={cn("h-9 w-9 text-muted-foreground", className)}
      {...props}
    >
      <XIcon className="pointer-events-none size-4" />
    </ComboboxPrimitive.Clear>
  )
}

function ComboboxInput({ className, children, disabled = false, showTrigger = true, showClear = false, ...props }) {
  return (
    <div data-slot="input-group" className={cn("relative flex w-auto items-center", className)}>
      <ComboboxPrimitive.Input
        disabled={disabled}
        className={cn(
          fieldControl,
          "rounded-field border-input py-2.5 aria-[invalid=true]:border-destructive",
          showTrigger && showClear ? "pr-20" : "pr-11"
        )}
        {...props}
      />
      <div className="absolute inset-y-0 right-1 flex items-center">
        {showClear && <ComboboxClear disabled={disabled} />}
        {showTrigger && <ComboboxTrigger disabled={disabled} />}
      </div>
      {children}
    </div>
  )
}

function ComboboxContent({ className, side = "bottom", sideOffset = 6, align = "start", alignOffset = 0, anchor, ...props }) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="pointer-events-auto isolate z-[60]"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          data-chips={!!anchor}
          className={cn(
            "auralis group/combobox-content relative max-h-96 w-[var(--anchor-width)] min-w-[var(--anchor-width)] max-w-[var(--available-width)] origin-[var(--transform-origin)] overflow-hidden rounded-tile border border-border bg-popover text-popover-foreground shadow-float",
            "transition-[opacity,transform] duration-100 data-[ending-style]:scale-95 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none",
            className
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

function ComboboxList({ className, ...props }) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn(
        "scrollbar-thin max-h-[min(21.75rem,calc(var(--available-height)-2.25rem))] scroll-py-1 overflow-y-auto p-1.5 data-[empty]:p-0",
        className
      )}
      {...props}
    />
  )
}

function ComboboxItem({ className, children, ...props }) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "relative flex min-h-11 w-full cursor-default select-none items-center gap-2 rounded-field py-2 pl-3 pr-9 text-sm outline-none data-[highlighted]:bg-tile data-[selected]:font-semibold data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        data-slot="combobox-item-indicator"
        render={<span className="pointer-events-none absolute right-3 flex size-4 items-center justify-center text-accent" />}
      >
        <CheckIcon className="pointer-events-none size-4" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  )
}

function ComboboxGroup({ className, ...props }) {
  return <ComboboxPrimitive.Group data-slot="combobox-group" className={cn(className)} {...props} />
}

function ComboboxLabel({ className, ...props }) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-label"
      className={cn("px-3 py-1.5 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function ComboboxCollection({ ...props }) {
  return <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />
}

function ComboboxEmpty({ className, ...props }) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(
        "hidden w-full justify-center px-3 py-4 text-center text-sm text-muted-foreground group-data-[empty]/combobox-content:flex",
        className
      )}
      {...props}
    />
  )
}

function ComboboxSeparator({ className, ...props }) {
  return <ComboboxPrimitive.Separator data-slot="combobox-separator" className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />
}

function ComboboxChips({ className, ...props }) {
  return (
    <ComboboxPrimitive.Chips
      data-slot="combobox-chips"
      className={cn(
        "flex min-h-11 flex-wrap items-center gap-1.5 rounded-field border border-input bg-card px-2.5 py-1.5 text-sm transition-colors focus-within:border-foreground has-[[aria-invalid=true]]:border-destructive",
        className
      )}
      {...props}
    />
  )
}

function ComboboxChip({ className, children, showRemove = true, ...props }) {
  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      className={cn(
        "flex h-7 w-fit items-center justify-center gap-1 whitespace-nowrap rounded-full bg-tile px-2.5 text-xs font-medium text-foreground has-[:disabled]:pointer-events-none has-[:disabled]:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      {showRemove && (
        <ComboboxPrimitive.ChipRemove
          render={<Button variant="ghost" size="icon" />}
          className="-mr-1.5 h-6 w-6 min-h-0 opacity-60 hover:opacity-100"
          data-slot="combobox-chip-remove"
        >
          <XIcon className="pointer-events-none size-3" />
        </ComboboxPrimitive.ChipRemove>
      )}
    </ComboboxPrimitive.Chip>
  )
}

function ComboboxChipsInput({ className, ...props }) {
  return <ComboboxPrimitive.Input data-slot="combobox-chip-input" className={cn("min-w-16 flex-1 bg-transparent outline-none", className)} {...props} />
}

function useComboboxAnchor() {
  return React.useRef(null)
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
}
