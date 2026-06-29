"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logFocusSession } from "@/app/actions/focus";
import type { FocusSession, FocusSessionType } from "@/lib/db-types";
import { cn } from "@/lib/utils";

const PRESETS = [15, 25, 45, 60] as const;
const STORAGE_KEY = "plusultra-focus-timer";

type TimerStatus = "setup" | "running" | "paused" | "complete" | "ended";

type StoredTimer = {
  intention: string;
  durationSeconds: number;
  remainingSeconds: number;
  status: TimerStatus;
  sessionStartedAt: number;
  endAt: number | null;
  sessionType: FocusSessionType;
};

type SessionMeta = {
  intention: string;
  plannedDurationSeconds: number;
  sessionStartedAt: number;
  sessionType: FocusSessionType;
};

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDurationLabel(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

function loadStored(): StoredTimer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredTimer;
    if (!parsed.intention || parsed.durationSeconds <= 0) return null;
    return {
      ...parsed,
      sessionType: parsed.sessionType === "void" ? "void" : "deep_work",
    };
  } catch {
    return null;
  }
}

function saveStored(timer: StoredTimer | null) {
  if (typeof window === "undefined") return;
  if (!timer) {
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
}

function writeStored(
  partial: Omit<StoredTimer, "remainingSeconds"> & { remainingSeconds?: number },
  remainingSeconds: number,
) {
  saveStored({
    intention: partial.intention,
    durationSeconds: partial.durationSeconds,
    remainingSeconds,
    status: partial.status,
    sessionStartedAt: partial.sessionStartedAt,
    endAt: partial.endAt,
    sessionType: partial.sessionType ?? "deep_work",
  });
}

export function FocusTimerClient({ sessions }: { sessions: FocusSession[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<TimerStatus>("setup");
  const [intention, setIntention] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [customMinutes, setCustomMinutes] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [sessionType, setSessionType] = useState<FocusSessionType>("deep_work");
  const [logError, setLogError] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [endedFocusedSeconds, setEndedFocusedSeconds] = useState(0);
  const [pending, startTransition] = useTransition();
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endAtRef = useRef<number | null>(null);
  const sessionMetaRef = useRef<SessionMeta>({
    intention: "",
    plannedDurationSeconds: 0,
    sessionStartedAt: 0,
    sessionType: "deep_work",
  });
  const hydrated = useRef(false);
  const loggingRef = useRef(false);
  const finishingRef = useRef(false);

  const setSessionMeta = useCallback((meta: SessionMeta) => {
    sessionMetaRef.current = meta;
    setIntention(meta.intention);
    setDurationSeconds(meta.plannedDurationSeconds);
    setSessionStartedAt(meta.sessionStartedAt);
    setSessionType(meta.sessionType);
  }, []);

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const recordSession = useCallback(
    (
      nextStatus: "completed" | "ended_early",
      focusedSeconds: number,
      meta: SessionMeta,
    ) => {
      if (loggingRef.current) return;
      loggingRef.current = true;
      setLogError(null);

      startTransition(async () => {
        try {
          const endedAt = new Date().toISOString();
          const res = await logFocusSession({
            intention: meta.intention,
            plannedDurationSeconds: meta.plannedDurationSeconds,
            focusedSeconds,
            status: nextStatus,
            startedAt: new Date(meta.sessionStartedAt).toISOString(),
            endedAt,
            sessionType: meta.sessionType,
          });
          if (!res.ok) {
            setLogError(res.error ?? "Failed to log session");
            return;
          }
          router.refresh();
        } finally {
          loggingRef.current = false;
        }
      });
    },
    [router],
  );

  const finishSession = useCallback(
    (meta: SessionMeta) => {
      if (finishingRef.current) return;
      if (meta.plannedDurationSeconds <= 0 || !meta.intention.trim()) return;

      finishingRef.current = true;
      clearTick();
      endAtRef.current = null;
      saveStored(null);
      setSessionMeta(meta);
      setRemainingSeconds(0);
      setStatus("complete");
      recordSession("completed", meta.plannedDurationSeconds, meta);
    },
    [clearTick, recordSession, setSessionMeta],
  );

  const syncRemaining = useCallback(() => {
    if (endAtRef.current === null || finishingRef.current) return;
    const left = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
    setRemainingSeconds(left);
    if (left <= 0) {
      finishSession(sessionMetaRef.current);
    }
  }, [finishSession]);

  const startTick = useCallback(() => {
    clearTick();
    syncRemaining();
    tickRef.current = setInterval(syncRemaining, 250);
  }, [clearTick, syncRemaining]);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const stored = loadStored();
    if (!stored) return;

    const meta: SessionMeta = {
      intention: stored.intention,
      plannedDurationSeconds: stored.durationSeconds,
      sessionStartedAt: stored.sessionStartedAt,
      sessionType: stored.sessionType,
    };
    setSessionMeta(meta);
    setDurationMinutes(Math.round(stored.durationSeconds / 60));

    if (stored.status === "running" && stored.endAt) {
      const left = Math.max(0, Math.ceil((stored.endAt - Date.now()) / 1000));
      setRemainingSeconds(left);

      if (left <= 0) {
        finishSession(meta);
        return;
      }

      endAtRef.current = stored.endAt;
      setStatus("running");
      startTick();
    } else if (stored.status === "paused" && stored.remainingSeconds > 0) {
      setRemainingSeconds(stored.remainingSeconds);
      setStatus("paused");
    }
  }, [startTick, finishSession, setSessionMeta]);

  useEffect(() => () => clearTick(), [clearTick]);

  useEffect(() => {
    const onVis = () => {
      if (status === "running") syncRemaining();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [status, syncRemaining]);

  const effectiveMinutes =
    customMinutes.trim() !== ""
      ? Math.min(180, Math.max(1, parseInt(customMinutes, 10) || 0))
      : durationMinutes;

  function startFocus() {
    const trimmed = intention.trim();
    if (!trimmed || effectiveMinutes < 1) return;

    const total = effectiveMinutes * 60;
    const started = Date.now();
    const endAt = started + total * 1000;
    const meta: SessionMeta = {
      intention: trimmed,
      plannedDurationSeconds: total,
      sessionStartedAt: started,
      sessionType,
    };

    finishingRef.current = false;
    loggingRef.current = false;
    setLogError(null);
    setSessionMeta(meta);
    setRemainingSeconds(total);
    endAtRef.current = endAt;
    setStatus("running");
    writeStored(
      {
        intention: trimmed,
        durationSeconds: total,
        status: "running",
        sessionStartedAt: started,
        endAt,
        sessionType,
      },
      total,
    );
    startTick();
  }

  function pauseFocus() {
    clearTick();
    endAtRef.current = null;
    setConfirmEnd(false);
    setStatus("paused");
    if (sessionMetaRef.current.sessionStartedAt) {
      writeStored(
        {
          intention: sessionMetaRef.current.intention,
          durationSeconds: sessionMetaRef.current.plannedDurationSeconds,
          status: "paused",
          sessionStartedAt: sessionMetaRef.current.sessionStartedAt,
          endAt: null,
          sessionType: sessionMetaRef.current.sessionType,
        },
        remainingSeconds,
      );
    }
  }

  function resumeFocus() {
    const endAt = Date.now() + remainingSeconds * 1000;
    endAtRef.current = endAt;
    setStatus("running");
    if (sessionMetaRef.current.sessionStartedAt) {
      writeStored(
        {
          intention: sessionMetaRef.current.intention,
          durationSeconds: sessionMetaRef.current.plannedDurationSeconds,
          status: "running",
          sessionStartedAt: sessionMetaRef.current.sessionStartedAt,
          endAt,
          sessionType: sessionMetaRef.current.sessionType,
        },
        remainingSeconds,
      );
    }
    startTick();
  }

  function requestEnd() {
    setConfirmEnd(true);
  }

  function cancelEnd() {
    setConfirmEnd(false);
  }

  function endEarly() {
    const meta = sessionMetaRef.current;
    if (!meta.sessionStartedAt) return;

    const focused = Math.max(0, meta.plannedDurationSeconds - remainingSeconds);
    clearTick();
    endAtRef.current = null;
    saveStored(null);
    setConfirmEnd(false);
    setEndedFocusedSeconds(focused);
    setStatus("ended");
    finishingRef.current = true;

    if (focused > 0) {
      recordSession("ended_early", focused, meta);
    }
  }

  function resetToSetup() {
    clearTick();
    endAtRef.current = null;
    saveStored(null);
    finishingRef.current = false;
    loggingRef.current = false;
    setStatus("setup");
    setRemainingSeconds(0);
    setIntention("");
    setSessionStartedAt(null);
    setDurationSeconds(0);
    setEndedFocusedSeconds(0);
    setConfirmEnd(false);
    setLogError(null);
    sessionMetaRef.current = {
      intention: "",
      plannedDurationSeconds: 0,
      sessionStartedAt: 0,
      sessionType: "deep_work",
    };
    setSessionType("deep_work");
  }

  const progress =
    durationSeconds > 0 ? 1 - remainingSeconds / durationSeconds : 0;
  const inFocus = status === "running" || status === "paused";
  const focusedSoFar = Math.max(0, durationSeconds - remainingSeconds);

  const todayLocal = new Date().toLocaleDateString("en-CA");
  const todayTotal = sessions
    .filter((s) => s.started_at.slice(0, 10) === todayLocal)
    .reduce((sum, s) => sum + s.focused_seconds, 0);

  return (
    <>
      {inFocus && sessionType === "void" && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black"
          role="dialog"
          aria-label="Void mode session"
        >
          <div
            className="h-3 w-3 rounded-full bg-white/70"
            style={{
              animation: "void-breathe 4s ease-in-out infinite",
            }}
          />
          {confirmEnd ? (
            <div className="absolute bottom-16 left-1/2 w-full max-w-xs -translate-x-1/2 space-y-4 px-6">
              <p className="text-center text-sm text-white/60">
                End void session
                {focusedSoFar > 0
                  ? ` and log ${formatDurationLabel(focusedSoFar)}?`
                  : "?"}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={cancelEnd}
                  className="btn flex-1 border-white/20 bg-transparent text-white/70"
                >
                  Stay
                </button>
                <button
                  type="button"
                  onClick={endEarly}
                  className="btn btn-primary flex-1"
                >
                  End
                </button>
              </div>
            </div>
          ) : (
            <div className="absolute bottom-10 flex gap-4">
              {status === "running" ? (
                <button
                  type="button"
                  onClick={pauseFocus}
                  className="text-xs text-white/30 transition hover:text-white/60"
                >
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resumeFocus}
                  className="text-xs text-white/50 transition hover:text-white/80"
                >
                  Resume
                </button>
              )}
              <button
                type="button"
                onClick={requestEnd}
                className="text-xs text-white/30 transition hover:text-white/60"
              >
                End
              </button>
            </div>
          )}
          <style jsx global>{`
            @keyframes void-breathe {
              0%,
              100% {
                transform: scale(1);
                opacity: 0.35;
              }
              50% {
                transform: scale(1.75);
                opacity: 0.85;
              }
            }
          `}</style>
        </div>
      )}

      {inFocus && sessionType === "deep_work" && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg px-6"
          role="dialog"
          aria-label="Focus session"
        >
          <div className="flex w-full max-w-sm flex-col items-center text-center">
            <p className="section-label mb-8">Focus</p>

            <div className="relative mb-10 flex h-56 w-56 items-center justify-center">
              <svg
                className="absolute inset-0 h-full w-full -rotate-90"
                viewBox="0 0 100 100"
                aria-hidden
              >
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="hsl(var(--bg-border))"
                  strokeWidth="1.5"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="hsl(var(--fg-muted))"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeDasharray={`${progress * 289} 289`}
                  className="transition-[stroke-dasharray] duration-500 ease-linear"
                />
              </svg>
              <span
                className={cn(
                  "font-mono text-5xl font-light tracking-tight text-fg tabular-nums sm:text-6xl",
                  status === "running" && "animate-pulse-subtle",
                )}
              >
                {formatTime(remainingSeconds)}
              </span>
            </div>

            <p className="max-w-xs text-base leading-relaxed text-fg">{intention}</p>

            {focusedSoFar > 0 && (
              <p className="mt-3 font-mono text-xs text-fg-subtle">
                {formatDurationLabel(focusedSoFar)} focused
              </p>
            )}

            {status === "paused" && (
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-fg-subtle">Paused</p>
            )}

            {confirmEnd ? (
              <div className="mt-10 w-full max-w-xs space-y-4 rounded-lg border border-bg-border bg-bg-subtle p-4">
                <p className="text-sm text-fg">
                  End this session
                  {focusedSoFar > 0
                    ? ` and log ${formatDurationLabel(focusedSoFar)}?`
                    : "?"}
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={cancelEnd} className="btn flex-1">
                    Keep going
                  </button>
                  <button type="button" onClick={endEarly} className="btn btn-primary flex-1">
                    End now
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-12 flex flex-wrap justify-center gap-3">
                {status === "running" ? (
                  <button type="button" onClick={pauseFocus} className="btn">
                    Pause
                  </button>
                ) : (
                  <button type="button" onClick={resumeFocus} className="btn btn-primary">
                    Resume
                  </button>
                )}
                <button
                  type="button"
                  onClick={requestEnd}
                  className="btn border-amber-500/40 text-amber-200 hover:bg-amber-500/10"
                >
                  End session
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {status === "ended" && (
        <section className="card flex flex-col items-center py-10 text-center">
          <p className="section-label">Session ended</p>
          {endedFocusedSeconds > 0 ? (
            <>
              <p className="mt-4 font-mono text-4xl font-light text-fg">
                {formatDurationLabel(endedFocusedSeconds)}
              </p>
              <p className="mt-1 text-xs text-fg-subtle">
                of {formatDurationLabel(durationSeconds)} planned
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm text-fg-muted">No time logged — session was too short.</p>
          )}
          <p className="mt-4 max-w-sm text-sm text-fg-muted">{intention}</p>
          {logError && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-red-400">{logError}</p>
              <button
                type="button"
                onClick={() =>
                  recordSession("ended_early", endedFocusedSeconds, sessionMetaRef.current)
                }
                disabled={pending}
                className="btn text-xs"
              >
                Retry save
              </button>
            </div>
          )}
          {pending && !logError && endedFocusedSeconds > 0 && (
            <p className="mt-3 text-xs text-fg-subtle">Logging session…</p>
          )}
          <button
            type="button"
            onClick={resetToSetup}
            disabled={pending}
            className="btn btn-primary mt-8"
          >
            Start another
          </button>
        </section>
      )}

      {status === "complete" && (
        <section className="card flex flex-col items-center py-10 text-center">
          <p className="section-label">Session complete</p>
          <p className="mt-4 font-mono text-4xl font-light text-fg">
            {formatTime(durationSeconds)}
          </p>
          <p className="mt-4 max-w-sm text-sm text-fg-muted">{intention}</p>
          {logError && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-red-400">{logError}</p>
              <button
                type="button"
                onClick={() =>
                  recordSession(
                    "completed",
                    sessionMetaRef.current.plannedDurationSeconds,
                    sessionMetaRef.current,
                  )
                }
                disabled={pending}
                className="btn text-xs"
              >
                Retry save
              </button>
            </div>
          )}
          {pending && !logError && (
            <p className="mt-3 text-xs text-fg-subtle">Logging session…</p>
          )}
          <button
            type="button"
            onClick={resetToSetup}
            disabled={pending}
            className="btn btn-primary mt-8"
          >
            Start another
          </button>
        </section>
      )}

      {status === "setup" && (
        <section className="card space-y-6">
          <div className="flex flex-col items-center py-6">
            {sessionType === "void" ? (
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-black">
                <div className="h-3 w-3 animate-pulse rounded-full bg-white/70" />
              </div>
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-full border border-bg-border">
                <span className="font-mono text-3xl font-light text-fg-muted">
                  {formatTime(effectiveMinutes * 60)}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="label">Mode</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSessionType("deep_work")}
                className={cn(
                  "pill cursor-pointer transition-colors",
                  sessionType === "deep_work"
                    ? "border-fg bg-fg text-bg"
                    : "hover:border-fg-muted/50 hover:text-fg",
                )}
              >
                Deep Work
              </button>
              <button
                type="button"
                onClick={() => setSessionType("void")}
                className={cn(
                  "pill cursor-pointer transition-colors",
                  sessionType === "void"
                    ? "border-fg bg-black text-white"
                    : "hover:border-fg-muted/50 hover:text-fg",
                )}
              >
                Void Mode
              </button>
            </div>
            {sessionType === "void" && (
              <p className="text-[10px] text-fg-subtle">
                Pure black screen — no timer visible. Just breathe.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="focus-intention" className="label">
              What are you focusing on?
            </label>
            <input
              id="focus-intention"
              type="text"
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              className="input"
              placeholder="e.g. Ship the Verizon dashboard refactor"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <p className="label">Duration</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setDurationMinutes(m);
                    setCustomMinutes("");
                  }}
                  className={cn(
                    "pill cursor-pointer transition-colors",
                    durationMinutes === m && customMinutes === ""
                      ? "border-fg bg-fg text-bg"
                      : "hover:border-fg-muted/50 hover:text-fg",
                  )}
                >
                  {m}m
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                min={1}
                max={180}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                placeholder="Custom"
                className="input w-24 font-mono"
              />
              <span className="text-xs text-fg-subtle">minutes (max 180)</span>
            </div>
          </div>

          <button
            type="button"
            onClick={startFocus}
            disabled={!intention.trim() || effectiveMinutes < 1}
            className="btn btn-primary w-full"
          >
            Start focus
          </button>
        </section>
      )}

      {status === "setup" && (
        <p className="text-center text-xs text-fg-subtle">
          Active timers survive page reloads in this tab. Closing the tab clears the in-progress
          timer — but any finished session is saved to your log.
        </p>
      )}

      <section className="card space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-label">Session log ({sessions.length})</h2>
          {todayTotal > 0 && (
            <span className="pill text-[10px]">
              Today · {formatDurationLabel(todayTotal)} focused
            </span>
          )}
        </header>
        {sessions.length === 0 ? (
          <p className="text-sm text-fg-muted">
            No sessions logged yet. Complete or end a focus block and it will show up here.
          </p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="rounded-md border border-bg-border bg-bg-subtle px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 flex-1 text-sm text-fg">{s.intention}</p>
                  <span
                    className={cn(
                      "pill shrink-0 text-[10px]",
                      s.status === "completed"
                        ? "border-fg/30 text-fg"
                        : "border-amber-500/40 text-amber-200",
                    )}
                  >
                    {s.status === "completed" ? "Done" : "Ended early"}
                  </span>
                  {(s.session_type ?? "deep_work") === "void" && (
                    <span className="pill shrink-0 border-white/20 bg-black text-[10px] text-white/70">
                      void
                    </span>
                  )}
                </div>
                <p className="mt-1.5 font-mono text-[10px] text-fg-subtle">
                  {formatDurationLabel(s.focused_seconds)} focused
                  {s.focused_seconds < s.planned_duration_seconds &&
                    ` · ${formatDurationLabel(s.planned_duration_seconds)} planned`}
                  {" · "}
                  {s.started_at.slice(0, 16).replace("T", " ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
