"use client";

import { useState, useTransition } from "react";
import { deleteRule, shiftRulePriority, updateRule } from "@/app/actions/rules";
import type { Rule } from "@/lib/db-types";
import { cn } from "@/lib/utils";

export function RulesTable({
  title,
  rules,
  muted,
}: {
  title: string;
  rules: Rule[];
  muted?: boolean;
}) {
  return (
    <section className={cn("card space-y-3", muted && "opacity-70")}>
      <h2 className="section-label">{title}</h2>
      {rules.length === 0 ? (
        <p className="text-xs italic text-fg-subtle">None.</p>
      ) : (
        <ul className="space-y-2">
          {rules.map((r) => (
            <RuleRow key={r.id} rule={r} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RuleRow({ rule }: { rule: Rule }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(rule.rule_text);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updateRule(rule.id, { rule_text: text });
      setEditing(false);
    });
  }

  function toggleActive() {
    startTransition(async () => {
      await updateRule(rule.id, { is_active: !rule.is_active });
    });
  }

  function remove() {
    if (!confirm("Delete this rule permanently?")) return;
    startTransition(async () => {
      await deleteRule(rule.id);
    });
  }

  return (
    <li
      className={cn(
        "rounded-lg border border-bg-border bg-bg-subtle p-3",
        pending && "opacity-50",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-0.5">
          <button
            onClick={() =>
              startTransition(() => shiftRulePriority(rule.id, -10))
            }
            className="text-fg-subtle transition-colors hover:text-fg"
            aria-label="raise priority"
          >
            ▲
          </button>
          <span className="font-mono text-[10px] text-fg-subtle">
            {rule.priority}
          </span>
          <button
            onClick={() =>
              startTransition(() => shiftRulePriority(rule.id, 10))
            }
            className="text-fg-subtle transition-colors hover:text-fg"
            aria-label="lower priority"
          >
            ▼
          </button>
        </div>

        <div className="flex-1">
          {editing ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              className="input text-sm"
            />
          ) : (
            <p
              className={cn(
                "text-sm text-fg",
                !rule.is_active && "line-through opacity-60",
              )}
            >
              {rule.rule_text}
            </p>
          )}
          <p className="mt-1 text-[10px] uppercase tracking-wider text-fg-subtle">
            last relevant {new Date(rule.last_relevant_at).toLocaleDateString()}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          {editing ? (
            <>
              <button onClick={save} className="btn btn-primary px-2 py-1 text-[10px]">
                Save
              </button>
              <button
                onClick={() => {
                  setText(rule.rule_text);
                  setEditing(false);
                }}
                className="btn px-2 py-1 text-[10px]"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="btn px-2 py-1 text-[10px]">
                Edit
              </button>
              <button onClick={toggleActive} className="btn px-2 py-1 text-[10px]">
                {rule.is_active ? "Archive" : "Reactivate"}
              </button>
              <button onClick={remove} className="btn btn-danger px-2 py-1 text-[10px]">
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}
