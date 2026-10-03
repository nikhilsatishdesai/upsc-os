"use client";

import * as React from "react";
import Link from "next/link";
import { useCleanPathname } from "@/hooks/use-clean-pathname";
import { ChevronRight, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { getBreadcrumbs, getChildren, getRoots } from "@/lib/syllabus";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSearch } from "@/components/search/search-provider";
import { isActivePath, settingsItem } from "@/components/layout/nav-items";
import { ExamCountdownMini } from "@/components/layout/exam-countdown-mini";
import { useAppStore } from "@/store/app-store";
import { usePrefsStore } from "@/store/prefs-store";
import { useUiStore } from "@/store/ui-store";
import { useMounted } from "@/hooks/use-mounted";

/** A node in the sidebar page tree. */
type TreeNode = {
  id: string;
  label: string;
  href: string;
  emoji?: string;
  children?: () => TreeNode[];
};

function syllabusChildren(nodeId: string | null, depth: number): TreeNode[] {
  const nodes = nodeId === null ? getRoots() : getChildren(nodeId);
  return nodes.map((node) => ({
    id: `syl:${node.id}`,
    label: node.title,
    href: `/syllabus/${node.id}`,
    // Stages → papers → units; topics live on the unit pages.
    children:
      depth < 2 && node.childIds.length > 0
        ? () => syllabusChildren(node.id, depth + 1)
        : undefined,
  }));
}

const PSIR_TREE: TreeNode = {
  id: "psir",
  label: "PSIR Optional",
  emoji: "🏛️",
  href: "/psir",
  children: () => [
    { id: "psir:thinkers", label: "Thinkers vault", emoji: "💬", href: "/psir/thinkers" },
    { id: "psir:books", label: "Booklist", emoji: "📖", href: "/psir/books" },
    { id: "psir:p1", label: "Paper I — Theory & Indian Politics", emoji: "📄", href: "/syllabus/mains.psir1" },
    { id: "psir:p2", label: "Paper II — Comparative & IR", emoji: "📄", href: "/syllabus/mains.psir2" },
  ],
};

const SYLLABUS_TREE: TreeNode = {
  id: "syllabus",
  label: "Syllabus",
  emoji: "📚",
  href: "/syllabus",
  children: () => syllabusChildren(null, 0),
};

/** Notion-style sidebar: workspace header, quick rows, a page tree with
 * toggles, and the exam countdown pinned to the bottom. */
export function Sidebar() {
  const pathname = useCleanPathname();
  const mounted = useMounted();
  const { setOpen } = useSearch();
  const displayName = useAppStore((state) => state.displayName);
  const optional = usePrefsStore((state) => state.optionalSubject);
  const expandedIds = useUiStore((state) => state.sidebarExpanded);
  const toggle = useUiStore((state) => state.toggleSidebarNode);
  const reveal = useUiStore((state) => state.revealSidebarNodes);
  const expanded = React.useMemo(
    () => new Set(mounted ? expandedIds : []),
    [mounted, expandedIds],
  );

  // Auto-reveal the current page in the tree.
  React.useEffect(() => {
    const match = pathname.match(/^\/syllabus\/(.+)$/);
    const ids: string[] = [];
    if (match) {
      ids.push("syllabus");
      for (const crumb of getBreadcrumbs(decodeURIComponent(match[1])).slice(0, -1)) {
        ids.push(`syl:${crumb.id}`);
      }
    }
    if (pathname.startsWith("/psir")) ids.push("psir");
    if (ids.length > 0) reveal(ids);
  }, [pathname, reveal]);

  const name = mounted && displayName.trim() ? displayName.trim() : "";
  const initial = (name[0] ?? "U").toUpperCase();
  const showPsir = !mounted || optional === "psir";

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="px-2 pt-2">
        <Link
          href="/settings"
          className="flex h-10 items-center gap-2 rounded-md px-2 transition-colors hover:bg-sidebar-accent"
          title="Profile & preferences"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-hero text-xs font-semibold text-white">
            {initial}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-sidebar-accent-foreground">
            {name ? `${name}'s UPSC OS` : "My UPSC OS"}
          </span>
        </Link>
      </div>

      <div className="space-y-px px-2 py-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-[30px] w-full items-center gap-2 rounded-md px-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
        >
          <span aria-hidden className="flex w-5 shrink-0 justify-center">
            <Search className="h-4 w-4" />
          </span>
          <span className="flex-1 text-left">Search</span>
          <kbd className="font-sans text-[11px] text-muted-foreground">Ctrl K</kbd>
        </button>
        <SidebarRow emoji="🏠" label="Dashboard" href="/dashboard" pathname={pathname} />
        <SidebarRow emoji="🗓️" label="Planner" href="/planner" pathname={pathname} />
      </div>

      <nav
        className="flex-1 overflow-y-auto px-2 pb-3 scrollbar-none"
        aria-label="Main navigation"
      >
        <SidebarSection label="Study">
          <TreeRow node={SYLLABUS_TREE} depth={0} expanded={expanded} toggle={toggle} pathname={pathname} />
          {showPsir && (
            <TreeRow node={PSIR_TREE} depth={0} expanded={expanded} toggle={toggle} pathname={pathname} />
          )}
          <SidebarRow emoji="✍️" label="Answer Writing" href="/practice" pathname={pathname} />
        </SidebarSection>
        <SidebarSection label="Mentor">
          <SidebarRow emoji="🧠" label="Chanakya" href="/chanakya" pathname={pathname} />
        </SidebarSection>
      </nav>

      <div className="space-y-1.5 border-t border-sidebar-border p-2">
        <ExamCountdownMini />
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <SidebarRow
              emoji={settingsItem.emoji}
              label={settingsItem.title}
              href={settingsItem.href}
              pathname={pathname}
            />
          </div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

function SidebarSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <p className="mb-0.5 px-2 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="space-y-px">{children}</div>
    </div>
  );
}

function SidebarRow({
  emoji,
  label,
  href,
  pathname,
}: {
  emoji: string;
  label: string;
  href: string;
  pathname: string;
}) {
  const active = isActivePath(pathname, href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-[30px] items-center gap-2 rounded-md px-2 text-sm transition-colors",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent",
      )}
    >
      <span aria-hidden className="w-5 shrink-0 text-center text-[15px] leading-none">
        {emoji}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

function TreeRow({
  node,
  depth,
  expanded,
  toggle,
  pathname,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  toggle: (id: string) => void;
  pathname: string;
}) {
  const open = expanded.has(node.id);
  const active = pathname === node.href;
  const hasChildren = !!node.children;

  return (
    <div>
      <div
        className={cn(
          "group flex h-[30px] items-center gap-1 rounded-md pr-2 text-sm transition-colors",
          active
            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent",
        )}
        style={{ paddingLeft: `${4 + depth * 12}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => toggle(node.id)}
            aria-label={open ? `Collapse ${node.label}` : `Expand ${node.label}`}
            aria-expanded={open}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"
          >
            <ChevronRight
              className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")}
            />
          </button>
        ) : (
          <span className="w-5 shrink-0 text-center text-muted-foreground">•</span>
        )}
        <Link
          href={node.href}
          aria-current={active ? "page" : undefined}
          className="flex min-w-0 flex-1 items-center gap-1.5"
        >
          {node.emoji && (
            <span aria-hidden className="shrink-0 text-[15px] leading-none">
              {node.emoji}
            </span>
          )}
          <span className="truncate">{node.label}</span>
        </Link>
      </div>
      {hasChildren && open && (
        <div className="space-y-px">
          {node.children!().map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              pathname={pathname}
            />
          ))}
        </div>
      )}
    </div>
  );
}
