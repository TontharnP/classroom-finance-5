"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import BottomTabNav from "@/components/layout/BottomTabNav";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { HydrationGate } from "@/components/layout/HydrationGate";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // The login page has no session yet, so it must render outside the data
  // hydration gate (which fetches authenticated data) and the app chrome.
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <HydrationGate fallback={<LoadingScreen />}>
      <div className="relative h-dvh overflow-hidden p-0 md:p-4 xl:p-5">
        <div className="app-shell flex h-full min-h-0 flex-col md:grid md:grid-cols-[104px_1fr] lg:grid-cols-[220px_1fr] md:rounded-[26px] xl:rounded-[30px]">
          <aside className="hidden min-h-0 overflow-hidden border-r md:block" style={{ borderColor: "var(--line)" }}>
            <Sidebar />
          </aside>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <MobileNav />
            <main className="mx-auto flex w-full max-w-[1420px] min-w-0 flex-1 flex-col overflow-hidden px-2.5 py-3 pb-[calc(5.25rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-4 md:min-h-0 md:px-5 md:py-6 md:pb-6 lg:px-7 xl:px-8 xl:py-8">{children}</main>
            <BottomTabNav />
          </div>
        </div>
      </div>
    </HydrationGate>
  );
}
