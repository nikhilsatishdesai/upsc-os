import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Fragment } from "react";

import { getAllNodes, getBreadcrumbs, getNode, isLeaf } from "@/lib/syllabus";
import { isPsirId } from "@/lib/psir";
import { TopicList } from "@/components/syllabus/topic-list";
import { RecentTracker } from "@/components/syllabus/recent-tracker";
import { SubtreeProgress } from "@/components/syllabus/subtree-progress";
import { TopicMeta } from "@/components/syllabus/topic-meta";
import { TopicPager } from "@/components/syllabus/topic-pager";
import { TopicFocusButton } from "@/components/syllabus/topic-focus-button";
import { TopicWorkspace } from "@/components/knowledge/topic-workspace";
import { BookmarkMenu } from "@/components/knowledge/bookmark-menu";
import { PlanTopicMenu } from "@/components/planner/plan-topic-menu";
import { PsirToolkit } from "@/components/psir/psir-toolkit";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllNodes().map((node) => ({ id: node.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const node = getNode(id);
  return { title: node ? node.title : "Syllabus" };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const node = getNode(id);
  if (!node) notFound();

  const crumbs = getBreadcrumbs(node.id);
  const parents = crumbs.slice(0, -1);
  const leaf = isLeaf(node);
  const psir = isPsirId(node.id);

  return (
    <div className="space-y-6">
      <RecentTracker nodeId={node.id} />

      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground md:hidden"
      >
        <Link href="/syllabus" className="hover:text-foreground">
          Syllabus
        </Link>
        {parents.map((crumb) => (
          <Fragment key={crumb.id}>
            <ChevronRight aria-hidden className="h-3 w-3" />
            <Link
              href={`/syllabus/${crumb.id}`}
              className="max-w-[16rem] truncate hover:text-foreground"
            >
              {crumb.title}
            </Link>
          </Fragment>
        ))}
      </nav>

      <header className="space-y-3">
        <div aria-hidden className="select-none text-[52px] leading-none md:text-[60px]">
          {leaf ? (psir ? "🏛️" : "📄") : node.depth <= 1 ? "📚" : "📂"}
        </div>
        <h1 className="max-w-3xl text-[28px] font-bold leading-[1.2] tracking-tight text-balance md:text-[36px]">
          {node.title}
        </h1>
        {node.description && (
          <p className="max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
            {node.description}
          </p>
        )}
        {leaf && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <TopicFocusButton topicId={node.id} />
            <PlanTopicMenu topicId={node.id} />
            <BookmarkMenu
              targetType="topic"
              targetId={node.id}
              topicId={node.id}
              label={node.title}
              size="lg"
            />
          </div>
        )}
      </header>

      {!leaf && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SubtreeProgress nodeId={node.id} className="w-full max-w-md" />
            {psir && (
              <Link
                href="/psir"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                PSIR command centre <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
          <TopicList nodeId={node.id} />
        </>
      )}

      {leaf && (
        <>
          <TopicMeta topicId={node.id} />
          <hr />
          {psir && <PsirToolkit topicId={node.id} />}
          <TopicWorkspace topicId={node.id} />
          <TopicPager topicId={node.id} />
        </>
      )}
    </div>
  );
}
