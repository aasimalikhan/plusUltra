"use client";

import { useState, useTransition } from "react";
import { applyCursorPlan } from "@/app/actions/cursor";
import { parseCursorPlanJson } from "@/lib/cursor-plan-validation";
import type { CursorPlan } from "@/lib/db-types";
import {
  ANALYSIS_PROVIDERS,
  type AnalysisProvider,
} from "@/lib/analysis-providers";

interface Result {
  ok: boolean;
  error?: string;
  runId?: string;
  tasksCreated?: number;
}

function tryParse(raw: string): { ok: true; plan: CursorPlan } | { ok: false; error: string } {
  const r = parseCursorPlanJson(raw);
  if (!r.ok) return r;
  return { ok: true, plan: r.parsed as CursorPlan };
}

export function CursorBridge({
  payloadsByProvider,
  markdown,
}: {
  payloadsByProvider: Record<AnalysisProvider, string>;
  markdown: string;
}) {
  const [provider, setProvider] = useState<AnalysisProvider>("cursor");
  const [copied, setCopied] = useState(false);
  const [raw, setRaw] = useState("");
  const [parsedPreview, setParsedPreview] = useState<CursorPlan | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  const fullPayload = payloadsByProvider[provider];
  const providerConfig = ANALYSIS_PROVIDERS.find((p) => p.id === provider)!;

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function previewPlan() {
    setResult(null);
    const r = tryParse(raw);
    if (!r.ok) {
      setParseError(r.error);
      setParsedPreview(null);
      return;
    }
    setParseError(null);
    setParsedPreview(r.plan);
  }

  function applyPlan() {
    if (!parsedPreview) return;
    startTransition(async () => {
      const res = await applyCursorPlan({
        rawInputMarkdown: markdown,
        rawOutputText: JSON.stringify(parsedPreview),
        provider,
      });
      setResult(res);
      if (res.ok) {
        setRaw("");
        setParsedPreview(null);
      }
    });
  }

  return (
    <div className="space-y-5">
      <section className="card space-y-3">
        <header>
          <h2 className="section-label">Provider</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Same payload and JSON schema — paste into Cursor, Gemini, or ChatGPT.
            Missed a night? Any provider works; paste JSON back here.
          </p>
        </header>
        <div className="flex flex-wrap gap-1.5">
          {ANALYSIS_PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProvider(p.id)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                provider === p.id
                  ? "border-fg bg-fg text-bg"
                  : "border-bg-border text-fg-muted hover:text-fg"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-fg-subtle">{providerConfig.description}</p>
      </section>

      <section className="card space-y-3">
        <header className="flex items-center justify-between">
          <h2 className="section-label">1 · Send to {providerConfig.label}</h2>
        </header>
        <p className="text-sm text-fg-muted">
          Copy the full payload into a <strong className="font-normal text-fg">new chat</strong> —
          briefing, analyst instructions, deadlines, work context, and 7 days of data.
        </p>
        <button
          type="button"
          onClick={() => copy(fullPayload)}
          className="btn btn-primary h-auto min-h-10 w-full whitespace-normal px-4 py-2.5 text-center leading-snug"
        >
          {copied ? "Copied" : `Copy everything (${providerConfig.label})`}
        </button>
        <details className="rounded-md border border-bg-border bg-bg-subtle">
          <summary className="cursor-pointer px-3 py-2 text-xs text-fg-muted">
            Preview payload ({fullPayload.length.toLocaleString()} chars)
          </summary>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap px-3 py-2 font-mono text-[11px] leading-relaxed text-fg-muted">
            {fullPayload}
          </pre>
        </details>
      </section>

      <section className="card space-y-3">
        <header>
          <h2 className="section-label">2 · Paste JSON back</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Paste the JSON from {providerConfig.label}. Triple-backtick fences are tolerated.
          </p>
        </header>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={10}
          className="input font-mono text-xs"
          placeholder='{ "summary": "...", "tomorrow_tasks": [...], "rule_changes": {...} }'
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={previewPlan}
            disabled={!raw.trim()}
            className="btn h-auto min-h-10 w-full whitespace-normal py-2.5"
          >
            Validate & preview
          </button>
          <button
            type="button"
            onClick={applyPlan}
            disabled={!parsedPreview || pending}
            className="btn btn-primary h-auto min-h-10 w-full whitespace-normal py-2.5"
          >
            {pending ? "Applying…" : "Apply plan"}
          </button>
        </div>
        {parseError && (
          <p className="text-xs text-red-400">JSON parse error: {parseError}</p>
        )}
      </section>

      {parsedPreview && <PlanPreview plan={parsedPreview} />}

      {result && (
        <section
          className={`card ${
            result.ok
              ? "border-emerald-500/30 bg-emerald-500/[0.04]"
              : "border-red-500/30 bg-red-500/[0.04]"
          }`}
        >
          {result.ok ? (
            <p className="text-sm text-emerald-300">
              Plan applied via {providerConfig.label}. Created {result.tasksCreated ?? 0}{" "}
              tasks for tomorrow. Run id:{" "}
              <span className="font-mono text-xs">{result.runId}</span>
            </p>
          ) : (
            <p className="text-sm text-red-300">Failed: {result.error}</p>
          )}
        </section>
      )}
    </div>
  );
}

function PlanPreview({ plan }: { plan: CursorPlan }) {
  return (
    <section className="card space-y-3">
      <h3 className="section-label">Diff preview</h3>
      <p className="text-sm text-fg">
        <span className="text-fg-subtle">Summary:</span> {plan.summary}
      </p>
      <div>
        <p className="label">Tomorrow&apos;s tasks ({plan.tomorrow_tasks.length})</p>
        <ul className="mt-1 space-y-1 text-sm">
          {plan.tomorrow_tasks.map((t, i) => (
            <li key={i} className="font-mono text-xs text-fg-muted">
              <span className="text-fg">[{t.macro_goal_slug}]</span>
              {t.category === "work" && (
                <span className="text-blue-300"> [work]</span>
              )}{" "}
              {t.task_name}
            </li>
          ))}
        </ul>
      </div>
      {plan.rule_changes && (
        <div className="space-y-2 text-xs text-fg-muted">
          {plan.rule_changes.add && plan.rule_changes.add.length > 0 && (
            <div>
              <p className="label">Add rules ({plan.rule_changes.add.length})</p>
              <ul className="mt-1 space-y-0.5">
                {plan.rule_changes.add.map((r, i) => (
                  <li key={i}>
                    <span className="text-emerald-400">+</span> [p
                    {r.priority ?? 100}] {r.rule_text}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {plan.rule_changes.demote && plan.rule_changes.demote.length > 0 && (
            <div>
              <p className="label">
                Demote rules ({plan.rule_changes.demote.length})
              </p>
              <ul className="mt-1 space-y-0.5 font-mono">
                {plan.rule_changes.demote.map((d, i) => (
                  <li key={i}>
                    <span className="text-fg">~</span> {d.id} → p{d.priority}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {plan.rule_changes.deactivate &&
            plan.rule_changes.deactivate.length > 0 && (
              <div>
                <p className="label">
                  Deactivate rules ({plan.rule_changes.deactivate.length})
                </p>
                <ul className="mt-1 space-y-0.5 font-mono">
                  {plan.rule_changes.deactivate.map((id, i) => (
                    <li key={i}>
                      <span className="text-red-400">-</span> {id}
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      )}
    </section>
  );
}
