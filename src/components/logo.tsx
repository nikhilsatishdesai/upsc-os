import Link from "next/link";
import { cn } from "@/lib/utils";

/** The UPSC OS mark: an indigo tile with a saffron "rising sun" dot. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-[10px] bg-hero text-[15px] font-bold text-white shadow-soft",
        className,
      )}
    >
      U
      <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-saffron" />
    </span>
  );
}

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
      <LogoMark />
      <span className="text-[15px] tracking-tight">
        UPSC <span className="text-primary">OS</span>
      </span>
    </Link>
  );
}
