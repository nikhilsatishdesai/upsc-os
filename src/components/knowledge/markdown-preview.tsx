"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import {
  CircleAlert,
  Info,
  Lightbulb,
  TriangleAlert,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Obsidian-style callouts inside blockquotes:
 *   > [!note] Optional title
 *   > Body…
 * Supported kinds: note, tip, warning, important.
 */
const CALLOUTS = {
  note: {
    icon: Info,
    className: "border-sky-500/40 bg-sky-500/10",
    label: "Note",
  },
  tip: {
    icon: Lightbulb,
    className: "border-emerald-500/40 bg-emerald-500/10",
    label: "Tip",
  },
  warning: {
    icon: TriangleAlert,
    className: "border-amber-500/40 bg-amber-500/10",
    label: "Warning",
  },
  important: {
    icon: CircleAlert,
    className: "border-red-500/40 bg-red-500/10",
    label: "Important",
  },
} as const;

type CalloutKind = keyof typeof CALLOUTS;

const CALLOUT_RE = /^\[!(note|tip|warning|important)\]\s*(.*)$/i;

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return extractText(node.props.children);
  }
  return "";
}

function Blockquote({ children }: { children?: React.ReactNode }) {
  const items = React.Children.toArray(children).filter(
    (child) => extractText(child).trim() !== "",
  );
  const firstText = extractText(items[0]).trim();
  const match = firstText.match(CALLOUT_RE);

  if (match) {
    const kind = match[1].toLowerCase() as CalloutKind;
    const meta = CALLOUTS[kind];
    const title = match[2] || meta.label;
    return (
      <div
        className={cn(
          "my-3 rounded-lg border px-4 py-3 text-sm",
          meta.className,
        )}
      >
        <p className="mb-1 flex items-center gap-2 font-semibold">
          <meta.icon className="h-4 w-4 shrink-0" /> {title}
        </p>
        <div className="[&>p:first-child]:mt-0">{items.slice(1)}</div>
      </div>
    );
  }

  return (
    <blockquote className="my-3 border-l-2 border-primary/50 pl-4 text-muted-foreground">
      {children}
    </blockquote>
  );
}

/** Renders knowledge-note markdown in the app's design language. */
export function MarkdownPreview({ markdown }: { markdown: string }) {
  if (markdown.trim() === "") {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing here yet — switch to Write and start typing.
      </p>
    );
  }
  return (
    <div className="space-y-3 text-sm leading-relaxed [&_li>input[type=checkbox]]:mr-2 [&_li>input[type=checkbox]]:accent-primary">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: (props) => (
            <h1 className="mt-5 border-b pb-1 text-xl font-semibold tracking-tight first:mt-0" {...props} />
          ),
          h2: (props) => (
            <h2 className="mt-5 text-lg font-semibold tracking-tight first:mt-0" {...props} />
          ),
          h3: (props) => (
            <h3 className="mt-4 text-base font-semibold first:mt-0" {...props} />
          ),
          h4: (props) => (
            <h4 className="mt-3 text-sm font-semibold first:mt-0" {...props} />
          ),
          p: (props) => <p className="my-2" {...props} />,
          ul: (props) => (
            <ul className="my-2 list-disc space-y-1 pl-5 [&_ul]:my-1" {...props} />
          ),
          ol: (props) => (
            <ol className="my-2 list-decimal space-y-1 pl-5" {...props} />
          ),
          a: (props) => (
            <a
              className="text-primary underline underline-offset-2 hover:opacity-80"
              target="_blank"
              rel="noreferrer noopener"
              {...props}
            />
          ),
          table: (props) => (
            <div className="my-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm" {...props} />
            </div>
          ),
          th: (props) => (
            <th className="border bg-secondary/60 px-3 py-1.5 text-left font-semibold" {...props} />
          ),
          td: (props) => <td className="border px-3 py-1.5 align-top" {...props} />,
          code: ({ className, ...props }) => (
            <code
              className={cn(
                "rounded bg-secondary px-1 py-0.5 font-mono text-[0.85em]",
                className,
              )}
              {...props}
            />
          ),
          pre: (props) => (
            <pre
              className="my-3 overflow-x-auto rounded-lg border bg-secondary/40 p-3 [&_code]:bg-transparent [&_code]:p-0"
              {...props}
            />
          ),
          blockquote: Blockquote,
          hr: () => <hr className="my-4" />,
          img: (props) => (
            // Notes reference remote images by URL; dimensions are unknown.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="my-3 max-h-96 rounded-lg border"
              alt={props.alt ?? ""}
              {...props}
            />
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
