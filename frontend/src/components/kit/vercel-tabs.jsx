"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/kit/tabs";
import { cn } from "@/lib/utils";

/**
 * tabs: [{ value, label, content?, href?, count? }]
 * Khi mọi tab có `href`, component render <nav> gồm các link (dùng cho menu điều hướng);
 * ngược lại render Radix Tabs (animate-ui) như bản gốc.
 */
export function VercelTabs({
  tabs,
  defaultTab,
  value,
  onValueChange,
  className,
  listClassName,
  contentClassName,
  ariaLabel,
}) {
  const controlled = value !== undefined;
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [uncontrolledTab, setUncontrolledTab] = useState(defaultTab || tabs[0]?.value);
  const [hoverStyle, setHoverStyle] = useState({});
  const [activeStyle, setActiveStyle] = useState({ left: "0px", width: "0px" });
  const tabRefs = useRef([]);
  const listRef = useRef(null);

  const activeTab = controlled ? value : uncontrolledTab;
  const activeIndex = tabs.findIndex((tab) => tab.value === activeTab);
  const isNav = tabs.length > 0 && tabs.every((tab) => tab.href);
  const hasContent = tabs.some((tab) => tab.content !== undefined);

  const handleChange = (next) => {
    if (!controlled) setUncontrolledTab(next);
    onValueChange?.(next);
  };

  const measureActive = useCallback(() => {
    const activeElement = tabRefs.current[activeIndex];
    if (activeElement) {
      const { offsetLeft, offsetWidth } = activeElement;
      setActiveStyle({ left: `${offsetLeft}px`, width: `${offsetWidth}px`, opacity: 1 });
    } else {
      setActiveStyle((s) => ({ ...s, opacity: 0 }));
    }
  }, [activeIndex]);

  useEffect(() => {
    if (hoveredIndex !== null) {
      const hoveredElement = tabRefs.current[hoveredIndex];
      if (hoveredElement) {
        const { offsetLeft, offsetWidth } = hoveredElement;
        setHoverStyle({
          left: `${offsetLeft}px`,
          width: `${offsetWidth}px`,
        });
      }
    }
  }, [hoveredIndex]);

  useLayoutEffect(() => {
    measureActive();
    const id = requestAnimationFrame(measureActive);
    return () => cancelAnimationFrame(id);
  }, [measureActive, tabs.length]);

  useEffect(() => {
    const el = listRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measureActive());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureActive]);

  const highlight = (
    <>
      {/* Hover Highlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 flex h-11 items-center rounded-full bg-tile transition-all duration-300 ease-out motion-reduce:transition-none"
        style={{
          ...hoverStyle,
          opacity: hoveredIndex !== null ? 1 : 0,
        }} />

      {/* Active Indicator */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-6px] h-[2px] rounded-full bg-accent transition-all duration-300 ease-out motion-reduce:transition-none"
        style={activeStyle} />
    </>
  );

  const triggerClass = (active) =>
    cn(
      "relative z-10 inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-transparent px-4 transition-colors duration-300",
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
      active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
    );

  const labelOf = (tab, active) => (
    <>
      <span className="whitespace-nowrap font-medium text-sm leading-5">{tab.label}</span>
      {tab.count != null && (
        <span
          className={cn(
            "inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-5",
            active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
          )}
        >
          {tab.count}
        </span>
      )}
    </>
  );

  if (isNav) {
    return (
      <nav aria-label={ariaLabel} className={cn("flex", className)}>
        <div ref={listRef} className={cn("relative flex select-none items-center gap-[6px]", listClassName)}>
          {highlight}
          {tabs.map((tab, index) => {
            const active = tab.value === activeTab;
            return (
              <Link
                key={tab.value}
                to={tab.href}
                ref={(el) => { tabRefs.current[index] = el; }}
                aria-current={active ? "page" : undefined}
                className={triggerClass(active)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => handleChange(tab.value)}
              >
                {labelOf(tab, active)}
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleChange}
      className={cn("flex w-full flex-col", className)}>
      <TabsList
        ref={listRef}
        aria-label={ariaLabel}
        className={cn("relative h-auto w-fit select-none justify-start gap-[6px] rounded-none bg-transparent p-0", listClassName)}>
        {highlight}

        {tabs.map((tab, index) => {
          const active = activeTab === tab.value;
          return (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              className={cn(
                triggerClass(active),
                "data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              )}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}>
              {labelOf(tab, active)}
            </TabsTrigger>
          );
        })}
      </TabsList>
      {hasContent && (
        <div className={cn("mt-8 w-full", contentClassName)}>
          {tabs.map((tab) => (
            <TabsContent
              key={tab.value}
              value={tab.value}
              className="mt-0 w-full">
              {tab.content}
            </TabsContent>
          ))}
        </div>
      )}
    </Tabs>
  );
}
