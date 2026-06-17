"use client";

import { useState, useTransition } from "react";
import { addDayCapture, deleteDayCapture } from "@/app/actions/captures";
import type { DayCapture } from "@/lib/db-types";

export function CapturesClient({ captures }: { captures: DayCapture[] }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await addDayCapture(text);
      if (!res.ok) {
        setError(res.error ?? "Failed to save");
        return;
      }
      setText("");
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteDayCapture(id);
    });
  }

  return (
    <div className="space-y-5">
      <section className="card space-y-3">
        <header>
          <h2 className="section-label">Add capture</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Paste a reel takeaway, link, quote, or random thought. All captures go into tonight&apos;s
            Gemini analysis, then are cleared when the plan applies.
          </p>
        </header>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="input text-sm"
          placeholder="e.g. Reel on compound interest — automate 20% savings before spending..."
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={pending || !text.trim()}
          className="btn btn-primary"
        >
          {pending ? "Saving…" : "Save capture"}
        </button>
      </section>

      <section className="card space-y-3">
        <header className="flex items-center justify-between gap-2">
          <h2 className="section-label">Today&apos;s captures ({captures.length})</h2>
          {captures.length > 0 && (
            <span className="pill text-[10px]">Included in nightly analysis</span>
          )}
        </header>
        {captures.length === 0 ? (
          <p className="text-sm text-fg-muted">
            Nothing saved yet. Drop thoughts here as they come — no need to organize.
          </p>
        ) : (
          <ul className="space-y-2">
            {captures.map((c) => (
              <li
                key={c.id}
                className="flex gap-3 rounded-md border border-bg-border bg-bg-subtle px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-sm text-fg">{c.content}</p>
                  <p className="mt-1 font-mono text-[10px] text-fg-subtle">
                    {c.created_at.slice(0, 16).replace("T", " ")}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(c.id)}
                  className="btn shrink-0 self-start text-xs text-red-400"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
