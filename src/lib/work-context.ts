import type { Task, UserProfile } from "@/lib/db-types";

export type WorkClient = "verizon" | "freelance";

export interface WorkContextBundle {
  verizon: string | null;
  freelance: string | null;
  /** Legacy single field — kept for backward compatibility reads. */
  legacy: string | null;
}

export function parseWorkContexts(
  profile: Pick<
    UserProfile,
    "work_context" | "work_context_verizon" | "work_context_freelance"
  > | null,
): WorkContextBundle {
  if (!profile) {
    return { verizon: null, freelance: null, legacy: null };
  }
  const verizon =
    profile.work_context_verizon?.trim() ||
    profile.work_context?.trim() ||
    null;
  const freelance = profile.work_context_freelance?.trim() || null;
  return {
    verizon,
    freelance,
    legacy: profile.work_context?.trim() || null,
  };
}

export function resolveWorkClient(
  task: Pick<Task, "category" | "work_client">,
): WorkClient | null {
  if ((task.category ?? "personal") !== "work") return null;
  if (task.work_client === "freelance" || task.work_client === "verizon") {
    return task.work_client;
  }
  return "verizon";
}

export function workClientLabel(client: WorkClient): string {
  return client === "verizon" ? "Verizon" : "Freelance";
}

export function formatWorkContextForAnalysis(bundle: WorkContextBundle): string[] {
  const lines: string[] = [];
  lines.push("## Work context · Verizon + freelance (keep separate from personal standards)");

  if (bundle.verizon) {
    lines.push("### Verizon · employer");
    lines.push(bundle.verizon);
    lines.push("");
  } else {
    lines.push("### Verizon · employer");
    lines.push("- (not configured — add on /manage)");
    lines.push("");
  }

  if (bundle.freelance) {
    lines.push("### Freelance · side clients / projects");
    lines.push(bundle.freelance);
    lines.push("");
  } else {
    lines.push("### Freelance · side clients / projects");
    lines.push("- (not configured — add on /manage)");
    lines.push("");
  }

  lines.push(
    "When adding tomorrow_tasks with category work, set work_client to verizon or freelance as appropriate.",
  );
  lines.push("");

  return lines;
}
