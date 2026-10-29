import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useMatches } from "react-router-dom";
import { DropdownMenu, Drawer } from "@animate-ui/react/primitives/radix-ui";
import { Fade } from "@animate-ui/react/primitives/effects/fade";
import { HiOutlineMenuAlt3, HiOutlineX, HiOutlineLogout, HiOutlineUser, HiOutlineChevronDown } from "react-icons/hi";
import { VercelTabs } from "@/components/kit/vercel-tabs";
import { Button } from "@/components/kit/button";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/app/PageHeader";
import Avatar from "../components/ui/Avatar";
import NotificationBell from "../components/common/NotificationBell";
import ChatbotWidget from "../components/common/ChatbotWidget";
import { useAuth } from "../context/AuthContext";

/** Mục đang active = mục có href dài nhất khớp với pathname (mục gốc chỉ khớp chính xác). */
function useActiveNav(items, pathname) {
  return useMemo(() => {
    let best = null;
    for (const item of items) {
      const match = item.end
        ? pathname === item.href || pathname === `${item.href}/`
        : pathname === item.href || pathname.startsWith(`${item.href}/`) || (item.also || []).some((p) => pathname.startsWith(p));
      if (match && (!best || item.href.length > best.href.length)) best = item;
    }
    return best?.value;
  }, [items, pathname]);
}

const BREAKPOINT = {
  lg: { grid: "lg:grid-cols-[1fr_auto_1fr]", tabs: "hidden lg:flex", trigger: "lg:hidden" },
  xl: { grid: "xl:grid-cols-[1fr_auto_1fr]", tabs: "hidden xl:flex", trigger: "xl:hidden" },
};

export default function AppShell({ navItems, roleLabel, profileHref, routeHeader = false, navBreakpoint = "lg" }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const matches = useMatches();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const active = useActiveNav(navItems, pathname);
  const home = navItems[0]?.href || "/";

  const handle = [...matches].reverse().find((m) => m.handle?.title)?.handle;
  const title = handle?.title;
  const bp = BREAKPOINT[navBreakpoint] || BREAKPOINT.lg;

  useEffect(() => {
    document.body.classList.add("auralis");
    return () => document.body.classList.remove("auralis");
  }, []);

  useEffect(() => {
    document.title = title ? `${title} · MediCare Hub` : "MediCare Hub";
  }, [title]);

  const tabs = navItems.filter((n) => n.tab !== false).map((n) => ({ value: n.value, label: n.label, href: n.href }));

  return (
    <div className="auralis relative isolate min-h-screen">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 top-24 h-[520px] w-[520px] rounded-full bg-banner/60 blur-3xl" />
        <div className="absolute -right-32 top-[38%] h-[460px] w-[460px] rounded-full bg-sky/80 blur-3xl" />
        <div className="absolute right-[20%] top-[-120px] h-[320px] w-[320px] rounded-full bg-lavender/20 blur-3xl" />
        <div className="absolute bottom-[-180px] left-[35%] h-[560px] w-[560px] rounded-full bg-banner/45 blur-3xl" />
      </div>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Bỏ qua điều hướng
      </a>

      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className={cn("mx-auto grid h-[72px] max-w-[1240px] grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-6 lg:px-8", bp.grid)}>
          <Link to={home} className="flex w-fit items-center gap-2.5 rounded-full" aria-label="MediCare Hub — Trang tổng quan">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-[15px] font-extrabold text-primary-foreground">M</span>
            <span className="leading-tight">
              <span className="block text-[15px] font-bold tracking-[-0.01em]">MediCare Hub</span>
              <span className="block text-[11px] font-medium text-muted-foreground">{roleLabel}</span>
            </span>
          </Link>

          <VercelTabs
            tabs={tabs}
            value={active}
            ariaLabel="Điều hướng chính"
            className={bp.tabs}
          />

          <div className="flex items-center justify-end gap-1.5">
            {user?.role === "patient" && <NotificationBell />}

            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button variant="ghost" className="hidden h-11 gap-2 pl-1.5 pr-3 sm:inline-flex" aria-label="Menu tài khoản">
                  <Avatar name={user?.fullName} src={user?.avatarUrl} color="#4E635A" size="sm" />
                  <span className="max-w-[140px] truncate text-sm font-semibold">{user?.fullName}</span>
                  <HiOutlineChevronDown aria-hidden className="text-muted-foreground" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={10}
                  className="auralis z-50 w-64 rounded-tile border border-border bg-card p-2 shadow-float"
                >
                  <DropdownMenu.Label className="px-3 py-2">
                    <p className="truncate text-sm font-semibold">{user?.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                  </DropdownMenu.Label>
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                  <DropdownMenu.Item asChild>
                    <Link
                      to={profileHref}
                      className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-field px-3 text-sm font-medium outline-none data-[highlighted]:bg-tile"
                    >
                      <HiOutlineUser aria-hidden className="h-4 w-4" /> Hồ sơ cá nhân
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={logout}
                    className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-field px-3 text-sm font-medium text-destructive outline-none data-[highlighted]:bg-destructive-soft"
                  >
                    <HiOutlineLogout aria-hidden className="h-4 w-4" /> Đăng xuất
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            <Drawer.Root open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
              <Drawer.Trigger asChild>
                <Button variant="ghost" size="icon" className={bp.trigger} aria-label="Mở menu">
                  <HiOutlineMenuAlt3 className="!size-5" />
                </Button>
              </Drawer.Trigger>
              <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
                <Drawer.Content className="auralis fixed inset-y-0 right-0 z-50 flex w-[min(340px,88vw)] flex-col border-l border-border bg-background outline-none">
                  <div className="flex items-center justify-between px-5 pb-2 pt-5">
                    <Drawer.Title className="text-title">Menu</Drawer.Title>
                    <Drawer.Description className="sr-only">Điều hướng {roleLabel}</Drawer.Description>
                    <Drawer.Close asChild>
                      <Button variant="tile" size="icon" aria-label="Đóng menu"><HiOutlineX /></Button>
                    </Drawer.Close>
                  </div>

                  <nav aria-label="Điều hướng chính" className="flex-1 overflow-y-auto px-3 py-2">
                    <ul className="space-y-1">
                      {navItems.map((item) => {
                        const isActive = item.value === active;
                        return (
                          <li key={item.value}>
                            <Link
                              to={item.href}
                              onClick={() => setDrawerOpen(false)}
                              aria-current={isActive ? "page" : undefined}
                              className={cn(
                                "flex min-h-12 items-center gap-3 rounded-full px-4 text-[15px] font-medium transition-colors",
                                isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-tile"
                              )}
                            >
                              {item.icon && <item.icon aria-hidden className="h-5 w-5 shrink-0" />}
                              {item.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </nav>

                  <div className="border-t border-border p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <Avatar name={user?.fullName} src={user?.avatarUrl} color="#4E635A" size="md" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{user?.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full text-destructive hover:border-destructive" onClick={logout}>
                      <HiOutlineLogout /> Đăng xuất
                    </Button>
                  </div>
                </Drawer.Content>
              </Drawer.Portal>
            </Drawer.Root>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1240px] px-4 pb-28 pt-8 outline-none sm:px-6 sm:pt-10 lg:px-8">
        <Fade key={pathname}>
          {routeHeader && title && !handle?.hero && <PageHeader title={title} description={handle?.subtitle} />}
          <Outlet />
        </Fade>
      </main>

      <ChatbotWidget />
    </div>
  );
}
