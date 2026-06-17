import { NextResponse } from "next/server";
import { getCronSecret, getAppTimezone, isGeminiConfigured } from "@/lib/analysis-env";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { runNightlyAnalysisForUser } from "@/lib/nightly-analysis";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Midnight nightly job: lock today → Gemini analysis → apply tomorrow's plan → clear captures.
 * Vercel Cron hits this route. Protect with CRON_SECRET header.
 *
 * Set PLUSULTRA_TIMEZONE to your IANA timezone and adjust vercel.json cron UTC hour
 * so it fires at local midnight (default cron: 05:00 UTC ≈ midnight US Eastern).
 */
export async function GET(request: Request) {
  const cronSecret = getCronSecret();
  if (!cronSecret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  if (!isGeminiConfigured() && !dryRun) {
    return NextResponse.json(
      { ok: false, error: "GEMINI_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const supabase = createSupabaseAdmin();
  const { data: users, error: usersErr } = await supabase
    .from("app_users")
    .select("id");

  if (usersErr) {
    return NextResponse.json({ ok: false, error: usersErr.message }, { status: 500 });
  }

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      timezone: getAppTimezone(),
      userCount: users?.length ?? 0,
    });
  }

  const results: Array<{
    userId: string;
    ok: boolean;
    skipped?: boolean;
    reason?: string;
    runId?: string;
    tasksCreated?: number;
    error?: string;
  }> = [];

  for (const user of users ?? []) {
    const result = await runNightlyAnalysisForUser(supabase, user.id, {
      skipIfAlreadyRun: true,
      forceLock: true,
    });

    if (!result.ok) {
      results.push({ userId: user.id, ok: false, error: result.error });
    } else if (result.skipped) {
      results.push({ userId: user.id, ok: true, skipped: true, reason: result.reason });
    } else {
      results.push({
        userId: user.id,
        ok: true,
        runId: result.runId,
        tasksCreated: result.tasksCreated,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    timezone: getAppTimezone(),
    processed: results.length,
    results,
  });
}
