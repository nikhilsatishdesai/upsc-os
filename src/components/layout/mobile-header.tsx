import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileSearchButton } from "@/components/search/search-trigger";

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 md:hidden">
      <Logo />
      <div className="flex items-center gap-1">
        <MobileSearchButton />
        <ThemeToggle />
      </div>
    </header>
  );
}
