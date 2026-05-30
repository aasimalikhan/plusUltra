"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setErrorMsg(null);
    const supabase = createSupabaseBrowserClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setErrorMsg(error.message);
        setPending(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMsg(error.message);
        setPending(false);
        return;
      }
    }

    router.push("/today");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex rounded-md border border-bg-border p-1">
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setErrorMsg(null);
          }}
          className={`flex-1 rounded-sm px-3 py-1.5 text-sm transition-colors ${
            mode === "signin"
              ? "bg-bg-subtle text-fg"
              : "text-fg-subtle hover:text-fg"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setErrorMsg(null);
          }}
          className={`flex-1 rounded-sm px-3 py-1.5 text-sm transition-colors ${
            mode === "signup"
              ? "bg-bg-subtle text-fg"
              : "text-fg-subtle hover:text-fg"
          }`}
        >
          Create account
        </button>
      </div>

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
        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="input mt-1"
          />
          {mode === "signup" && (
            <p className="mt-1 text-[10px] text-fg-subtle">At least 6 characters.</p>
          )}
        </div>
        <button type="submit" disabled={pending} className="btn btn-primary w-full">
          {pending
            ? "Please wait…"
            : mode === "signup"
              ? "Create account"
              : "Sign in"}
        </button>
        {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
      </form>

      <p className="text-center text-[10px] text-fg-subtle">
        No magic links. Email + password only.
      </p>
    </div>
  );
}
