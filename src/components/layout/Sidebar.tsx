"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/layout/navItems";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col items-center gap-5 px-3 py-6 lg:items-stretch lg:px-4">
      <Link href="/dashboard" className="visual-gradient pressable flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black text-white shadow-lg lg:w-full lg:justify-start lg:gap-3 lg:px-4">
        <span>S</span>
        <span className="hidden text-sm font-bold lg:inline">SMTE Finance</span>
      </Link>
      <nav className="flex flex-1 flex-col items-center gap-2.5 pt-8 lg:items-stretch">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`nav-item ${active ? "nav-item-active" : ""} pressable flex h-12 w-12 items-center justify-center rounded-2xl px-0 lg:w-full lg:justify-start lg:gap-3 lg:px-4`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.6 : 2} />
              <span className="hidden min-w-0 truncate text-sm font-semibold lg:inline">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mb-2">
        <ThemeToggle compact />
      </div>
    </div>
  );
}
