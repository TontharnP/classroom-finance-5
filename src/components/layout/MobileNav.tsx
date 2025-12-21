"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./navItems";
import { Menu as MenuIcon, X as XIcon } from "lucide-react";

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const startX = useRef<number | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [pathname]);

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
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-white/80 px-3 backdrop-blur dark:bg-black/40 md:hidden safe-top">
      <Link href="/dashboard" className="font-semibold">Classroom Finance 5.0</Link>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
        aria-controls="mobile-drawer"
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        <MenuIcon className="h-5 w-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" aria-modal="true" role="dialog">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Close navigation overlay"
          />
          <div
            id="mobile-drawer"
            ref={drawerRef}
            className="absolute left-0 top-0 h-full w-80 max-w-[85%] overflow-y-auto border-r bg-white p-4 shadow-xl outline-none dark:bg-zinc-950"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold">เมนู</span>
              <button
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Close menu"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map(item => {
                const active = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-md px-3 py-3 text-base hover:bg-black/5 dark:hover:bg-white/10 ${active ? 'bg-black/10 dark:bg-white/10' : ''}`}
                  >
                    <Image src={item.icon} alt="" className="h-5 w-5" />
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
