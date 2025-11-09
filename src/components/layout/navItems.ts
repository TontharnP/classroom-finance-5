import dashboardIcon from "@/image/dashboard.svg";
import transactionsIcon from "@/image/transactions.svg";
import schedulesIcon from "@/image/schedules.svg";
import categoriesIcon from "@/image/category.svg";
import studentsIcon from "@/image/students.svg";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: dashboardIcon },
  { href: "/transactions", label: "Transactions", icon: transactionsIcon },
  { href: "/schedule", label: "Schedule", icon: schedulesIcon },
  { href: "/categories", label: "Categories", icon: categoriesIcon },
  { href: "/students", label: "Students", icon: studentsIcon },
] as const;

export type NavItem = typeof NAV_ITEMS[number];
