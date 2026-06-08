"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ATTACK_MODE_CHUNKS,
  type AttackModeChunk,
} from "@/content/attack-mode";
import {
  ATTACK_MODE_SECTIONS,
  chunkModuleLabel,
  DISPLAY_TO_CHUNK_MODULE,
} from "@/content/attack-mode/sections";
import type { AttackModeSearchResult } from "@/content/attack-mode";
import { highlightQueryInSnippet, searchAttackMode } from "@/lib/attack-mode-search";
import { cn } from "@/lib/utils";

function renderContent(content: string) {
  const blocks = content.split(/\n\n+/);
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("## ")) {
      return (
        <h3 key={i} className="font-display text-base font-semibold text-fg">
          {trimmed.slice(3).replace(/\*\*/g, "")}
        </h3>
      );
    }

    if (trimmed.startsWith("- ")) {
      const items = trimmed.split("\n").filter((l) => l.startsWith("- "));
      return (
        <ul key={i} className="list-inside list-disc space-y-1.5 text-sm text-fg-muted">
          {items.map((item, j) => (
            <li key={j}>
              <InlineBold text={item.slice(2)} />
            </li>
          ))}
        </ul>
      );
    }

    return (
      <p key={i} className="text-sm leading-relaxed text-fg-muted">
        <InlineBold text={trimmed} />
      </p>
    );
  });
}

function InlineBold({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-medium text-fg">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function ChunkCard({
  chunk,
  highlight = false,
}: {
  chunk: AttackModeChunk;
  highlight?: boolean;
}) {
  return (
    <article
      id={chunk.id}
      className={cn(
        "scroll-mt-28 rounded-lg border border-bg-border bg-bg-card p-5 shadow-card transition-[border-color,box-shadow]",
        highlight && "border-fg/30 shadow-[0_0_0_1px_hsl(var(--fg)/0.08)]",
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="pill">{chunk.section}</span>
        <span className="pill">{chunkModuleLabel(chunk.module)}</span>
      </div>
      <h2 className="font-display text-lg font-semibold tracking-tight text-fg">
        {chunk.title}
      </h2>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {chunk.tags.slice(0, 6).map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-bg-subtle px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-fg-subtle"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-4 space-y-3">{renderContent(chunk.content)}</div>
    </article>
  );
}

function SearchResultRow({
  result,
  query,
  onSelect,
}: {
  result: AttackModeSearchResult;
  query: string;
  onSelect: (id: string) => void;
}) {
  const parts = highlightQueryInSnippet(result.snippet, query);

  return (
    <button
      type="button"
      onClick={() => onSelect(result.chunk.id)}
      className="w-full rounded-md border border-transparent px-3 py-2.5 text-left transition-colors hover:border-bg-border hover:bg-bg-subtle"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-sm text-fg">{result.chunk.title}</span>
        <span className="text-[10px] uppercase tracking-wide text-fg-subtle">
          {chunkModuleLabel(result.chunk.module)}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-fg-muted">
        {parts.map((p, i) =>
          p.match ? (
            <mark
              key={i}
              className="rounded-sm bg-fg/15 px-0.5 text-fg not-italic"
            >
              {p.text}
            </mark>
          ) : (
            <span key={i}>{p.text}</span>
          ),
        )}
      </p>
    </button>
  );
}

export function AttackModeReader() {
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string>("all");
  const [activeModule, setActiveModule] = useState<string>("all");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const searchResults = useMemo(
    () => (query.trim() ? searchAttackMode(query, 15) : []),
    [query],
  );

  const modulesInSection = useMemo(() => {
    if (activeSection === "all") {
      return [...new Set(ATTACK_MODE_CHUNKS.map((c) => c.module))];
    }
    const section = ATTACK_MODE_SECTIONS.find((s) => s.id === activeSection);
    return section?.modules ?? [];
  }, [activeSection]);

  const visibleChunks = useMemo(() => {
    return ATTACK_MODE_CHUNKS.filter((chunk) => {
      if (activeSection !== "all" && chunk.section !== activeSection) return false;
      if (activeModule !== "all") {
        const chunkModule = DISPLAY_TO_CHUNK_MODULE[activeModule] ?? activeModule;
        if (chunk.module !== chunkModule) return false;
      }
      return true;
    });
  }, [activeSection, activeModule]);

  const jumpToChunk = useCallback((id: string) => {
    setQuery("");
    setSearchFocused(false);
    setHighlightId(id);
    setActiveSection("all");
    setActiveModule("all");

    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    window.setTimeout(() => setHighlightId(null), 2500);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        setSearchFocused(true);
      }
      if (e.key === "Escape") {
        setSearchFocused(false);
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const showSearchPanel = searchFocused && query.trim().length > 0;

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative">
        <label htmlFor="attack-mode-search" className="sr-only">
          Search attack mode notes
        </label>
        <input
          ref={searchRef}
          id="attack-mode-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => window.setTimeout(() => setSearchFocused(false), 150)}
          placeholder="Search topics, triggers, philosophy…"
          className="input pr-20"
          autoComplete="off"
          spellCheck={false}
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-bg-border bg-bg-subtle px-1.5 py-0.5 font-display text-[10px] text-fg-subtle sm:inline">
          Ctrl K
        </kbd>

        {showSearchPanel && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 max-h-[min(24rem,60vh)] overflow-y-auto rounded-lg border border-bg-border bg-bg-card shadow-card">
            {searchResults.length === 0 ? (
              <p className="px-4 py-3 text-sm text-fg-muted">No matches for &ldquo;{query}&rdquo;</p>
            ) : (
              <div className="divide-y divide-bg-border p-1">
                <p className="px-3 py-2 text-[10px] uppercase tracking-wide text-fg-subtle">
                  {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} · local search
                </p>
                {searchResults.map((result) => (
                  <SearchResultRow
                    key={result.chunk.id}
                    result={result}
                    query={query}
                    onSelect={jumpToChunk}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section + module filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <FilterPill
            active={activeSection === "all"}
            onClick={() => {
              setActiveSection("all");
              setActiveModule("all");
            }}
          >
            All
          </FilterPill>
          {ATTACK_MODE_SECTIONS.map((s) => (
            <FilterPill
              key={s.id}
              active={activeSection === s.id}
              onClick={() => {
                setActiveSection(s.id);
                setActiveModule("all");
              }}
            >
              {s.label}
            </FilterPill>
          ))}
        </div>

        {modulesInSection.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <FilterPill
              active={activeModule === "all"}
              onClick={() => setActiveModule("all")}
              subtle
            >
              All modules
            </FilterPill>
            {modulesInSection.map((m) => (
              <FilterPill
                key={m}
                active={activeModule === m}
                onClick={() => setActiveModule(m)}
                subtle
              >
                {m}
              </FilterPill>
            ))}
          </div>
        )}
      </div>

      {/* Table of contents */}
      <nav className="card space-y-2" aria-label="Table of contents">
        <p className="section-label">Contents · {visibleChunks.length} topics</p>
        <ul className="space-y-1">
          {visibleChunks.map((chunk) => (
            <li key={chunk.id}>
              <button
                type="button"
                onClick={() => jumpToChunk(chunk.id)}
                className="w-full rounded-md px-2 py-1.5 text-left text-sm text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
              >
                <span className="text-fg-subtle">{chunkModuleLabel(chunk.module)} · </span>
                {chunk.title}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Content */}
      <div className="space-y-4">
        {visibleChunks.map((chunk) => (
          <ChunkCard
            key={chunk.id}
            chunk={chunk}
            highlight={highlightId === chunk.id}
          />
        ))}
      </div>
    </div>
  );
}

function FilterPill({
  children,
  active,
  onClick,
  subtle,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  subtle?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-fg bg-fg text-bg"
          : subtle
            ? "border-transparent bg-bg-subtle text-fg-muted hover:text-fg"
            : "border-bg-border text-fg-muted hover:border-fg-subtle/30 hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
