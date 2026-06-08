/** Shared execution-rate math — used on /today, /history, and tests. */

export interface ExecutionCounts {
  done: number;
  missed: number;
  pending: number;
}

export interface ExecutionRateResult {
  /** Locked days: done / (done + missed). Open days with pending: done / (done + missed + pending). */
  rate: number | null;
  /** True when the day still has open tasks and is not locked. */
  isOpen: boolean;
}

/**
 * Compute execution rate for a day or rolling window.
 * - Locked / no pending: done ÷ (done + missed) — same as 14-day system rate.
 * - Open (pending > 0, not locked): done ÷ (done + missed + pending) — honest in-progress rate.
 */
export function computeExecutionRate(
  counts: ExecutionCounts,
  isLocked = true,
): ExecutionRateResult {
  const { done, missed, pending } = counts;
  const isOpen = !isLocked && pending > 0;

  if (isOpen) {
    const total = done + missed + pending;
    return {
      rate: total === 0 ? null : done / total,
      isOpen: true,
    };
  }

  const total = done + missed;
  return {
    rate: total === 0 ? null : done / total,
    isOpen: false,
  };
}

export function formatExecutionRatePercent(rate: number | null): string | null {
  if (rate === null) return null;
  return `${Math.round(rate * 100)}%`;
}
