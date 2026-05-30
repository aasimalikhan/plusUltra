import type { Rule } from "@/lib/db-types";

export function RulesBanner({ rules }: { rules: Rule[] }) {
  if (rules.length === 0) {
    return (
      <section className="card">
        <p className="text-xs text-fg-subtle">
          No NEW ME rules yet. Add them on the{" "}
          <span className="font-mono text-fg-muted">/rules</span> page.
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-label">NEW ME · read every day</h2>
        <span className="text-[10px] text-fg-subtle">
          {rules.length} active
        </span>
      </div>
      <ol className="space-y-2.5">
        {rules.map((rule, i) => (
          <li
            key={rule.id}
            className="flex gap-3 text-sm leading-relaxed text-fg"
          >
            <span className="select-none font-mono text-xs text-fg-subtle">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>{rule.rule_text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
