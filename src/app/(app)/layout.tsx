import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MobileHeader } from "@/components/layout/mobile-header";
import { TopBar } from "@/components/layout/top-bar";
import { SearchProvider } from "@/components/search/search-provider";
import { FocusPill } from "@/components/focus/focus-pill";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <SearchProvider>
      <div className="min-h-screen bg-app">
        <Sidebar />
        <MobileHeader />
        <main className="pb-28 md:pb-16 md:pl-60">
          <TopBar />
          <div className="mx-auto w-full max-w-[1080px] px-4 py-6 md:px-12 md:pt-8">
            {children}
          </div>
        </main>
        <MobileNav />
        <FocusPill />
      </div>
    </SearchProvider>
  );
}
