import {
  LayoutDashboard,
  Library,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Syllabus", href: "/syllabus", icon: Library },
  { title: "Settings", href: "/settings", icon: Settings },
];
