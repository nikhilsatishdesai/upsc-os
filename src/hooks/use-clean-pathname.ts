"use client";

import { usePathname } from "next/navigation";

/**
 * The current pathname without a trailing slash. Static hosting (GitHub
 * Pages) serves routes as /page/ — active-link checks, breadcrumbs and the
 * sidebar tree compare against slash-less paths, so normalise once here.
 */
export function useCleanPathname(): string {
  const pathname = usePathname() ?? "/";
  return pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
}
