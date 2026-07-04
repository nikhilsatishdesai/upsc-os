import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      <Logo />
      <ThemeToggle />
    </header>
  );
}
