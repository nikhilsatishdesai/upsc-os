import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Fragment } from "react";

import { getAllNodes, getBreadcrumbs, getNode, isLeaf } from "@/lib/syllabus";
import { TopicList } from "@/components/syllabus/topic-list";
import { RecentTracker } from "@/components/syllabus/recent-tracker";
import { StatusSelect } from "@/components/syllabus/status-select";
import { SubtreeProgress } from "@/components/syllabus/subtree-progress";
import { TopicMeta } from "@/components/syllabus/topic-meta";
import { TopicWorkspace } from "@/components/knowledge/topic-workspace";
import { BookmarkMenu } from "@/components/knowledge/bookmark-menu";
import { PlanTopicMenu } from "@/components/planner/plan-topic-menu";

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

  return (
    <div className="space-y-6">
      <RecentTracker nodeId={node.id} />

      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link href="/syllabus" className="hover:text-foreground">
          Syllabus
        </Link>
        {parents.map((crumb) => (
          <Fragment key={crumb.id}>
            <ChevronRight aria-hidden className="h-3 w-3" />
            <Link
              href={`/syllabus/${crumb.id}`}
              className="hover:text-foreground"
            >
              {crumb.title}
            </Link>
          </Fragment>
        ))}
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {node.title}
          </h1>
          {node.description && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {node.description}
            </p>
          )}
        </div>
        {leaf && (
          <div className="flex items-center gap-2">
            <BookmarkMenu
              targetType="topic"
              targetId={node.id}
              topicId={node.id}
              label={node.title}
              size="lg"
            />
            <PlanTopicMenu topicId={node.id} />
            <StatusSelect topicId={node.id} size="lg" />
          </div>
        )}
      </div>

      {!leaf && (
        <>
          <SubtreeProgress nodeId={node.id} className="max-w-md" />
          <TopicList nodeId={node.id} />
        </>
      )}

      {leaf && (
        <>
          <TopicMeta topicId={node.id} />
          <TopicWorkspace topicId={node.id} />
        </>
      )}
    </div>
  );
}
