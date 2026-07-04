"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { navItems } from "@/components/layout/nav-items";
import { MobileSearchButton } from "@/components/search/search-trigger";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden"
    >
      <div
        className="grid grid-cols-5"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {navItems.slice(0, 3).map((item) => (
          <MobileNavLink
            key={item.href}
            href={item.href}
            title={item.title}
            active={
              pathname === item.href || pathname.startsWith(item.href + "/")
            }
          >
            <item.icon className="h-5 w-5" />
          </MobileNavLink>
        ))}
        <MobileSearchButton />
        {navItems.slice(3).map((item) => (
          <MobileNavLink
            key={item.href}
            href={item.href}
            title={item.title}
            active={
              pathname === item.href || pathname.startsWith(item.href + "/")
            }
          >
            <item.icon className="h-5 w-5" />
          </MobileNavLink>
        ))}
      </div>
    </nav>
  );
}

function MobileNavLink({
  href,
  title,
  active,
  children,
}: {
  href: string;
  title: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      {children}
      {title}
    </Link>
  );
}
