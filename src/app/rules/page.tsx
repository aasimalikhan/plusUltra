import { fetchAllRules } from "@/lib/queries";
import { AddRuleForm } from "./AddRuleForm";
import { RulesTable } from "./RulesTable";

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const rules = await fetchAllRules();
  const active = rules.filter((r) => r.is_active);
  const archived = rules.filter((r) => !r.is_active);

  return (
    <div className="space-y-5">
      <div>
        <p className="section-label">Management</p>
        <h1 className="h1 mt-1">NEW ME · rules</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Default codes drummed into your head every day. Lower priority number
          = higher visual rank. Demote stale rules; deactivate the ones you have
          outgrown.
        </p>
      </div>

      <AddRuleForm />

      <RulesTable title={`Active · ${active.length}`} rules={active} />
      {archived.length > 0 && (
        <RulesTable title={`Archived · ${archived.length}`} rules={archived} muted />
      )}
    </div>
  );
}
