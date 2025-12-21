"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./navItems";

export default function BottomTabNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/90 backdrop-blur dark:bg-black/40 md:hidden safe-bottom">
      <ul className="mx-auto grid max-w-screen-sm grid-cols-5 gap-1 px-2 py-1.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <li key={item.href} className="flex justify-center">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-[11px] ${active ? 'text-blue-600' : 'text-zinc-600 dark:text-zinc-300'} hover:bg-black/5 dark:hover:bg-white/10`}
              >
                <Image src={item.icon} alt="" className="h-5 w-5" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
