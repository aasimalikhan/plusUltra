"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { signInAction, signUpAction } from "@/app/actions/auth";

type Mode = "signin" | "signup";

function SubmitButton({ mode }: { mode: Mode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary w-full">
      {pending
        ? "Please wait…"
        : mode === "signup"
          ? "Create account"
          : "Sign in"}
    </button>
  );
}

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [signInError, signInFormAction] = useFormState(signInAction, null);
  const [signUpError, signUpFormAction] = useFormState(signUpAction, null);
  const errorMsg = mode === "signin" ? signInError : signUpError;
  const formAction = mode === "signin" ? signInFormAction : signUpFormAction;

  return (
    <div className="space-y-4">
      <div className="flex rounded-md border border-bg-border p-1">
        <button
          type="button"
          onClick={() => setMode("signin")}
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
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-sm px-3 py-1.5 text-sm transition-colors ${
            mode === "signup"
              ? "bg-bg-subtle text-fg"
              : "text-fg-subtle hover:text-fg"
          }`}
        >
          Create account
        </button>
      </div>

      <form action={formAction} className="card space-y-4">
        <div>
          <label htmlFor="username" className="label">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            minLength={3}
            autoComplete="username"
            placeholder="yourname"
            className="input mt-1"
          />
        </div>
        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            placeholder="••••••••"
            className="input mt-1"
          />
          {mode === "signup" && (
            <p className="mt-1 text-[10px] text-fg-subtle">
              At least 6 characters.
            </p>
          )}
        </div>
        <SubmitButton mode={mode} />
        {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
      </form>

      <p className="text-center text-[10px] text-fg-subtle">
        Username + password. No email, no magic links.
      </p>
    </div>
  );
}
