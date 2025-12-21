"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import logo from "@/image/logo/logo.svg";
import { NAV_ITEMS } from "@/components/layout/navItems";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="mb-2 flex items-center gap-3 rounded-xl bg-blue-600/90 px-3 py-2 text-white dark:bg-blue-700">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
          <Image src={logo} alt="SMTE FINANCE" className="h-6 w-6" />
        </div>
        <div className="text-base font-semibold tracking-wide">SMTE FINANCE 5.0</div>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
                active ? "bg-black/10 dark:bg-white/10" : ""
              }`}
            >
              <Image src={icon} alt={label} className="h-4 w-4" />
              <span className="flex-1 truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-2 text-xs text-zinc-500">
        © {new Date().getFullYear()} Classroom Finance
      </div>
    </div>
  );
}
