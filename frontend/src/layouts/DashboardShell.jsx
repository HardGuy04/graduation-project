import { useState } from "react";
import { Outlet, useMatches } from "react-router-dom";
import Sidebar from "../components/common/Sidebar";
import Topbar from "../components/common/Topbar";
import ChatbotWidget from "../components/common/ChatbotWidget";

export default function DashboardShell({ navItems, roleLabel }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const matches = useMatches();
  const current = [...matches].reverse().find((m) => m.handle?.title);
  const title = current?.handle?.title || "Tổng quan";
  const subtitle = current?.handle?.subtitle;

  return (
    <div className="min-h-screen flex bg-paper">
      <Sidebar items={navItems} roleLabel={roleLabel} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar title={title} subtitle={subtitle} onOpenMobile={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
      <ChatbotWidget />
    </div>
  );
}
