import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/dashboard",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2.5 font-semibold", className)}
    >
      <span
        aria-hidden
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-sm font-bold text-primary-foreground shadow-sm"
      >
        U
      </span>
      <span className="text-base tracking-tight">
        UPSC <span className="text-primary">OS</span>
      </span>
    </Link>
  );
}
