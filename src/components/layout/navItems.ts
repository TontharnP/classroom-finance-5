import { CalendarDays, ChartNoAxesCombined, FolderKanban, ReceiptText, UsersRound } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Dash", icon: ChartNoAxesCombined },
  { href: "/transactions", label: "Transactions", shortLabel: "Pay", icon: ReceiptText },
  { href: "/schedule", label: "Schedule", shortLabel: "Schedule", icon: CalendarDays },
  { href: "/categories", label: "Categories", shortLabel: "Groups", icon: FolderKanban },
  { href: "/students", label: "Students", shortLabel: "Students", icon: UsersRound },
] as const;

export type NavItem = typeof NAV_ITEMS[number];
