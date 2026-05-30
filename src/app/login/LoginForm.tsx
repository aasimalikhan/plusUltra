"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="card text-center">
        <p className="text-sm text-fg">
          Magic link sent to{" "}
          <span className="font-mono text-fg-muted">{email}</span>.
        </p>
        <p className="mt-2 text-xs text-fg-subtle">
          Open it from the same browser. The link expires in 1 hour.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="input mt-1"
        />
      </div>
      <button type="submit" disabled={status === "sending"} className="btn btn-primary w-full">
        {status === "sending" ? "Sending…" : "Send magic link"}
      </button>
      {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
    </form>
  );
}
