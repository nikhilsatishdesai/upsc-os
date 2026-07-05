"use client";

import * as React from "react";
import {
  ExternalLink,
  File,
  FileText,
  Globe,
  HardDrive,
  Image,
  Link2,
  MonitorPlay,
  Plus,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  RESOURCE_KINDS,
  type ResourceKind,
} from "@/lib/knowledge/types";
import { useKnowledgeStore } from "@/store/knowledge-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

const KIND_ICONS: Record<ResourceKind, LucideIcon> = {
  pdf: FileText,
  image: Image,
  video: Video,
  youtube: MonitorPlay,
  website: Globe,
  drive: HardDrive,
  document: File,
  link: Link2,
};

/** PDFs, videos, sites, Drive files — the topic's external material. */
export function ResourcesSection({ topicId }: { topicId: string }) {
  const resources = useKnowledgeStore((state) => state.resources);
  const addResource = useKnowledgeStore((state) => state.addResource);
  const removeResource = useKnowledgeStore((state) => state.removeResource);

  const [title, setTitle] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [kind, setKind] = React.useState<ResourceKind>("link");

  const items = React.useMemo(
    () =>
      Object.values(resources)
        .filter((resource) => resource.topicId === topicId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [resources, topicId],
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (title.trim() === "") return;
    addResource(topicId, {
      title: title.trim(),
      url: url.trim(),
      kind,
    });
    setTitle("");
    setUrl("");
  };

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <NativeSelect
          aria-label="Resource type"
          value={kind}
          onChange={(event) => setKind(event.target.value as ResourceKind)}
          className="w-32"
        >
          {RESOURCE_KINDS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title"
          className="min-w-36 flex-1"
        />
        <Input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https:// (optional for local documents)"
          className="min-w-48 flex-1"
        />
        <Button type="submit" size="sm" disabled={title.trim() === ""}>
          <Plus /> Add
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Attach the PDFs, videos and links you actually study from — one
          place, searchable.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((resource) => {
            const Icon = KIND_ICONS[resource.kind];
            return (
              <li
                key={resource.id}
                className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2 text-sm shadow-sm"
              >
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  {resource.url ? (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 font-medium hover:text-primary"
                    >
                      <span className="truncate">{resource.title}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </a>
                  ) : (
                    <span className="truncate font-medium">{resource.title}</span>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    {RESOURCE_KINDS.find((k) => k.value === resource.kind)?.label}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Delete resource"
                  onClick={() => removeResource(resource.id)}
                  className="shrink-0 rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
