"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { NAV_ITEMS } from "@/components/layout/navItems";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full min-h-0 flex-col items-center gap-5 overflow-hidden px-3 py-6 lg:items-stretch lg:px-4">
      <Link href="/dashboard" className="visual-gradient pressable flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black text-white shadow-lg lg:w-full lg:justify-start lg:gap-3 lg:px-4">
        <span>S</span>
        <span className="hidden text-sm font-bold lg:inline">การเงินห้องเรียน</span>
      </Link>
      <nav className="flex min-h-0 flex-1 flex-col items-center gap-2.5 overflow-y-auto pt-8 lg:items-stretch">
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
      <div className="mb-2 flex flex-col items-center gap-2 lg:items-stretch">
        <button
          type="button"
          onClick={handleLogout}
          title="ออกจากระบบ"
          aria-label="ออกจากระบบ"
          className="nav-item pressable flex h-12 w-12 items-center justify-center rounded-2xl px-0 lg:w-full lg:justify-start lg:gap-3 lg:px-4"
        >
          <LogOut className="h-5 w-5" />
          <span className="hidden min-w-0 truncate text-sm font-semibold lg:inline">ออกจากระบบ</span>
        </button>
        <ThemeToggle compact />
      </div>
    </div>
  );
}
