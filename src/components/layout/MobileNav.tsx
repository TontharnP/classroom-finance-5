"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./navItems";
import { Menu as MenuIcon, X as XIcon } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const startX = useRef<number | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  // Close drawer on route change
  useEffect(() => {
    queueMicrotask(() => setOpen(false));
  }, [pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (open) document.body.classList.add("overflow-hidden");
    else document.body.classList.remove("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, [open]);

  // Handle ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Basic swipe-to-close on drawer
  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < -60) setOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b px-3 sm:px-4 md:hidden safe-top" style={{ background: "color-mix(in srgb, var(--panel) 84%, transparent)", borderColor: "var(--line)", backdropFilter: "var(--blur-nav)" }}>
      <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
        <span className="visual-gradient flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-black text-white shadow-md">S</span>
        <span className="truncate text-sm min-[360px]:text-base">SMTE Finance</span>
      </Link>
      <div className="flex items-center gap-2">
        <ThemeToggle compact />
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          aria-controls="mobile-drawer"
          className="apple-icon-button pressable"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" aria-modal="true" role="dialog">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xl"
            onClick={() => setOpen(false)}
            aria-label="Close navigation overlay"
          />
          <div
            id="mobile-drawer"
            ref={drawerRef}
            className="absolute left-0 top-0 h-full w-80 max-w-[85%] overflow-y-auto border-r p-4 shadow-xl outline-none"
            style={{ background: "color-mix(in srgb, var(--panel-solid) 88%, transparent)", borderColor: "var(--line)", backdropFilter: "var(--blur-glass)" }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold">เมนู</span>
              <button
                onClick={() => setOpen(false)}
                className="apple-icon-button h-9 w-9 pressable"
                aria-label="Close menu"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map(item => {
                const active = pathname?.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`nav-item ${active ? "nav-item-active" : ""} flex items-center gap-3 rounded-2xl px-3 py-3 text-base font-semibold`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
