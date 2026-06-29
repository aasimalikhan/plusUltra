"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  applyCursorPlan,
  generateAndApplyGeminiAnalysis,
  generateGeminiAnalysis,
  resetTodayAnalysisAndRerun,
  triggerNightlyAnalysisNow,
} from "@/app/actions/cursor";
import { parseCursorPlanJson } from "@/lib/cursor-plan-validation";
import type { ContextSummary } from "@/lib/context-formatter";
import type { CursorPlan } from "@/lib/db-types";

interface Result {
  ok: boolean;
  error?: string;
  runId?: string;
  tasksCreated?: number;
  skipped?: boolean;
  reason?: string;
  runsDeleted?: number;
  cursorTasksDeleted?: number;
}

function tryParse(raw: string): { ok: true; plan: CursorPlan } | { ok: false; error: string } {
  const r = parseCursorPlanJson(raw);
  if (!r.ok) return r;
  return { ok: true, plan: r.parsed as CursorPlan };
}

export function CursorBridge({
  markdown,
  fullPayload,
  contextSummary,
  geminiApiEnabled,
  runAlreadyToday,
  captureCount,
  timezone,
}: {
  markdown: string;
  fullPayload: string;
  contextSummary: ContextSummary;
  geminiApiEnabled: boolean;
  runAlreadyToday: boolean;
  captureCount: number;
  timezone: string;
}) {
  const [copied, setCopied] = useState(false);
  const [raw, setRaw] = useState("");
  const [parsedPreview, setParsedPreview] = useState<CursorPlan | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [generating, setGenerating] = useState(false);
  const [pending, startTransition] = useTransition();

  async function runGeminiGenerate(applyAfter: boolean) {
    setResult(null);
    setParseError(null);
    setGenerating(true);
    try {
      if (applyAfter) {
        startTransition(async () => {
          const res = await generateAndApplyGeminiAnalysis();
          setResult(res);
          setGenerating(false);
          if (res.ok) {
            setRaw("");
            setParsedPreview(null);
          }
        });
        return;
      }

      const res = await generateGeminiAnalysis();
      setGenerating(false);
      if (!res.ok) {
        setParseError(res.error);
        setParsedPreview(null);
        return;
      }
      setRaw(res.rawOutputText);
      setParsedPreview(res.plan);
    } catch (err) {
      setGenerating(false);
      setParseError(err instanceof Error ? err.message : "Generation failed");
      setParsedPreview(null);
    }
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
        provider: "gemini",
      });
      setResult(res);
      if (res.ok) {
        setRaw("");
        setParsedPreview(null);
      }
    });
  }

  function runFullPipelineNow() {
    setResult(null);
    startTransition(async () => {
      const res = await triggerNightlyAnalysisNow();
      setResult(res);
    });
  }

  function runResetAndRerunToday() {
    if (
      !confirm(
        "Delete today's analysis run and all AI (cursor) tasks on today's plan, then call Gemini again and apply fresh tasks to TODAY?",
      )
    ) {
      return;
    }
    setResult(null);
    startTransition(async () => {
      const res = await resetTodayAnalysisAndRerun();
      setResult(res);
    });
  }

  async function copyPayload() {
    await navigator.clipboard.writeText(fullPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-5">
      <section className="card space-y-3">
        <header>
          <h2 className="section-label">Context loaded for Gemini</h2>
          <p className="mt-1 text-sm text-fg-muted">
            This is what gets sent when you click Run — briefing, analyst instructions, and 7
            days of live data ({fullPayload.length.toLocaleString()} chars).
          </p>
        </header>
        <div className="flex flex-wrap gap-1.5">
          {[
            ["Tasks", contextSummary.tasks],
            ["Journal", contextSummary.journal],
            ["Deadlines", contextSummary.deadlines],
            ["Goals", contextSummary.goals],
            ["Rules", contextSummary.rules],
            ["Captures", contextSummary.captures],
            ["Prior runs", contextSummary.runs],
          ].map(([label, count]) => (
            <span key={label as string} className="pill">
              {label}: {count as number}
            </span>
          ))}
          {contextSummary.hasWorkContext && (
            <span className="pill">Work context</span>
          )}
          {contextSummary.templates > 0 && (
            <span className="pill">Templates: {contextSummary.templates}</span>
          )}
        </div>
        <button
          type="button"
          onClick={copyPayload}
          className="btn h-auto min-h-10 w-full whitespace-normal py-2.5"
        >
          {copied ? "Copied full payload" : "Copy full payload (what Gemini receives)"}
        </button>
        <details className="rounded-md border border-bg-border bg-bg-subtle">
          <summary className="cursor-pointer px-3 py-2 text-xs text-fg-muted">
            Preview full payload
          </summary>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap px-3 py-2 font-mono text-[11px] leading-relaxed text-fg-muted">
            {fullPayload}
          </pre>
        </details>
        <details className="rounded-md border border-bg-border bg-bg-subtle">
          <summary className="cursor-pointer px-3 py-2 text-xs text-fg-muted">
            Preview live data only ({markdown.length.toLocaleString()} chars — stored in analysis_runs)
          </summary>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap px-3 py-2 font-mono text-[11px] leading-relaxed text-fg-muted">
            {markdown}
          </pre>
        </details>
      </section>

      <section className="card space-y-3 border-emerald-500/25 bg-emerald-500/[0.03]">
        <header>
          <h2 className="section-label">Gemini · automated analysis</h2>
          <p className="mt-1 text-sm text-fg-muted">
            One API call per day. Sends 7 days of tasks, journal, deadlines, goals, rules, and{" "}
            {captureCount > 0 ? (
              <strong className="font-normal text-fg">{captureCount} day capture{captureCount === 1 ? "" : "s"}</strong>
            ) : (
              "day captures"
            )}{" "}
            to Gemini. Returns structured JSON → tomorrow&apos;s tasks + rule changes.
          </p>
          <p className="mt-1 text-xs text-fg-subtle">
            Auto-runs at local midnight ({timezone}) via cron. You can also run manually below.
          </p>
        </header>

        {runAlreadyToday ? (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/[0.06] px-3 py-2.5 text-sm text-emerald-200/90">
            <p className="font-medium">Today&apos;s analysis is done ({timezone})</p>
            <p className="mt-1 text-xs text-emerald-200/70">
              One automatic run per IST calendar day. View on{" "}
              <Link href="/insights" className="underline hover:text-emerald-100">
                /insights
              </Link>
              . Building features and need a fresh run? Use reset below.
            </p>
            {geminiApiEnabled && (
              <button
                type="button"
                onClick={runResetAndRerunToday}
                disabled={pending}
                className="btn mt-3 w-full border-amber-500/40 text-amber-200 hover:bg-amber-500/10"
              >
                {pending ? "Working…" : "Reset today & rerun Gemini"}
              </button>
            )}
          </div>
        ) : geminiApiEnabled ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => runGeminiGenerate(false)}
              disabled={generating || pending}
              className="btn h-auto min-h-10 w-full whitespace-normal py-2.5"
            >
              {generating ? "Calling Gemini…" : "Preview only"}
            </button>
            <button
              type="button"
              onClick={() => runGeminiGenerate(true)}
              disabled={generating || pending}
              className="btn btn-primary h-auto min-h-10 w-full whitespace-normal py-2.5"
            >
              {generating || pending ? "Working…" : "Run & apply now"}
            </button>
          </div>
        ) : (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/[0.04] px-3 py-2.5 text-sm text-amber-200/90">
            <p className="font-medium">API key not configured</p>
            <p className="mt-1 text-xs text-amber-200/70">
              Add <code className="font-mono">GEMINI_API_KEY</code> to{" "}
              <code className="font-mono">.env.local</code>. Get a free key at{" "}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-amber-100"
              >
                Google AI Studio
              </a>
              .
            </p>
          </div>
        )}

        {captureCount === 0 && !runAlreadyToday && (
          <p className="text-xs text-fg-subtle">
            No day captures yet —{" "}
            <Link href="/captures" className="underline hover:text-fg-muted">
              add reels & thoughts on /captures
            </Link>{" "}
            before tonight&apos;s run.
          </p>
        )}

        {parseError && <p className="text-xs text-red-400">{parseError}</p>}
      </section>

      <section className="card space-y-3">
        <header>
          <h2 className="section-label">Midnight cron (simulate)</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Same as production cron at 00:00 {timezone}: lock yesterday → Gemini → apply to
            today → roll standards.
          </p>
        </header>
        <button
          type="button"
          onClick={runFullPipelineNow}
          disabled={pending || !geminiApiEnabled}
          className="btn w-full"
        >
          {pending ? "Running…" : "Run midnight pipeline now"}
        </button>
        {geminiApiEnabled && (
          <button
            type="button"
            onClick={runResetAndRerunToday}
            disabled={pending}
            className="btn w-full border-amber-500/40 text-amber-200 hover:bg-amber-500/10"
          >
            {pending ? "Working…" : "Reset today & rerun (dev)"}
          </button>
        )}
      </section>

      <details className="card space-y-3">
        <summary className="cursor-pointer text-sm text-fg-muted">
          Advanced · manual JSON fallback
        </summary>
        <p className="text-sm text-fg-muted">
          Only if the API fails. Paste validated JSON from any LLM. Still limited to one apply per day.
        </p>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={8}
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
            disabled={!parsedPreview || pending || runAlreadyToday}
            className="btn btn-primary h-auto min-h-10 w-full whitespace-normal py-2.5"
          >
            {pending ? "Applying…" : "Apply plan"}
          </button>
        </div>
        {parseError && (
          <p className="text-xs text-red-400">JSON parse error: {parseError}</p>
        )}
        {parsedPreview && <PlanPreview plan={parsedPreview} />}
      </details>

      {result && (
        <section
          className={`card ${
            result.ok
              ? "border-emerald-500/30 bg-emerald-500/[0.04]"
              : "border-red-500/30 bg-red-500/[0.04]"
          }`}
        >
          {result.ok ? (
            result.skipped ? (
              <p className="text-sm text-fg-muted">{result.reason ?? "Skipped"}</p>
            ) : (
              <p className="text-sm text-emerald-300">
                Plan applied. Created {result.tasksCreated ?? 0} task
                {(result.tasksCreated ?? 0) === 1 ? "" : "s"}.
                {result.runsDeleted != null && result.runsDeleted > 0 && (
                  <> Cleared {result.runsDeleted} prior run(s).</>
                )}
                {result.cursorTasksDeleted != null && result.cursorTasksDeleted > 0 && (
                  <> Removed {result.cursorTasksDeleted} old AI task(s).</>
                )}{" "}
                Run id: <span className="font-mono text-xs">{result.runId}</span>
              </p>
            )
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
    <section className="space-y-3 border-t border-bg-border pt-3">
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
        </div>
      )}
    </section>
  );
}
