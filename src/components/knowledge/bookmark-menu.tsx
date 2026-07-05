"use client";

import * as React from "react";
import { Bookmark as BookmarkIcon, FolderPlus } from "lucide-react";

import { cn } from "@/lib/utils";
import type { BookmarkTargetType } from "@/lib/knowledge/types";
import { useKnowledgeStore } from "@/store/knowledge-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Star-toggle + collection picker for any bookmarkable entity. The star
 * fills when the target sits in at least one collection.
 */
export function BookmarkMenu({
  targetType,
  targetId,
  topicId,
  label,
  size = "sm",
}: {
  targetType: BookmarkTargetType;
  targetId: string;
  topicId: string;
  /** Accessible name of the thing being bookmarked. */
  label: string;
  size?: "sm" | "lg";
}) {
  const bookmarks = useKnowledgeStore((state) => state.bookmarks);
  const collections = useKnowledgeStore((state) => state.collections);
  const addBookmark = useKnowledgeStore((state) => state.addBookmark);
  const removeBookmark = useKnowledgeStore((state) => state.removeBookmark);
  const addCollection = useKnowledgeStore((state) => state.addCollection);

  const [newOpen, setNewOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");

  const mine = React.useMemo(
    () =>
      Object.values(bookmarks).filter(
        (bookmark) =>
          bookmark.targetType === targetType && bookmark.targetId === targetId,
      ),
    [bookmarks, targetType, targetId],
  );
  const bookmarked = mine.length > 0;
  const sorted = React.useMemo(
    () =>
      Object.values(collections).sort(
        (a, b) =>
          Number(b.builtin) - Number(a.builtin) || a.name.localeCompare(b.name),
      ),
    [collections],
  );

  const toggle = (collectionId: string) => {
    const existing = mine.find(
      (bookmark) => bookmark.collectionId === collectionId,
    );
    if (existing) removeBookmark(existing.id);
    else addBookmark(targetType, targetId, topicId, collectionId);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Bookmark ${label}`}
            className={cn(
              "shrink-0 rounded p-1 transition-colors hover:bg-secondary",
              bookmarked
                ? "text-amber-500"
                : "text-muted-foreground/60 hover:text-foreground",
            )}
          >
            <BookmarkIcon
              className={cn(
                size === "lg" ? "h-5 w-5" : "h-4 w-4",
                bookmarked && "fill-current",
              )}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Save to collection</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {sorted.map((collection) => (
            <DropdownMenuCheckboxItem
              key={collection.id}
              checked={mine.some(
                (bookmark) => bookmark.collectionId === collection.id,
              )}
              onCheckedChange={() => toggle(collection.id)}
            >
              {collection.name}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setNewOpen(true)}>
            <FolderPlus /> New collection…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New bookmark collection</DialogTitle>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="e.g. Important Cases"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={newName.trim() === ""}
              onClick={() => {
                addCollection(newName.trim());
                setNewName("");
                setNewOpen(false);
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
