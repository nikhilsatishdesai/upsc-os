import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MobileHeader } from "@/components/layout/mobile-header";
import { SearchProvider } from "@/components/search/search-provider";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <SearchProvider>
      <div className="min-h-screen">
        <Sidebar />
        <MobileHeader />
        <main className="pb-24 md:pb-8 md:pl-64">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
            {children}
          </div>
        </main>
        <MobileNav />
      </div>
    </SearchProvider>
  );
}
