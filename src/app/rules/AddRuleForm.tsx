"use client";

import { useRef, useTransition } from "react";
import { addRule } from "@/app/actions/rules";

export function AddRuleForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await addRule(fd);
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="card space-y-3">
      <div>
        <label className="label">New rule</label>
        <input
          name="rule_text"
          required
          placeholder="e.g. Phone outside the room overnight. Always."
          className="input mt-1"
        />
      </div>
      <div className="flex items-end gap-3">
        <div className="w-28">
          <label className="label">Priority</label>
          <input
            name="priority"
            type="number"
            min={1}
            defaultValue={100}
            className="input mt-1"
          />
        </div>
        <button type="submit" disabled={pending} className="btn btn-primary flex-1">
          {pending ? "Adding…" : "Add rule"}
        </button>
      </div>
    </form>
  );
}
