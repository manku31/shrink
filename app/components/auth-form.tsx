"use client";

import { useActionState } from "react";
import { login, signup } from "../actions/auth";

type Props = {
  mode: "login" | "signup";
};

const inputClass =
  "mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-3 text-base text-zinc-900 sm:py-2.5 sm:text-sm shadow-sm placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}

export function AuthForm({ mode }: Props) {
  const isSignup = mode === "signup";
  const [state, action, pending] = useActionState(isSignup ? signup : login, undefined);
  const errors = state?.errors;

  return (
    <form action={action} className="space-y-4" noValidate={false}>
      {errors?.form && (
        <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {errors.form}
        </p>
      )}

      {isSignup && (
        <div>
          <label htmlFor="username" className="text-sm font-medium">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            minLength={3}
            maxLength={30}
            pattern="[a-zA-Z0-9_]+"
            title="Letters, numbers and underscores only"
            placeholder="jane_doe"
            defaultValue={state?.values?.username}
            aria-invalid={!!errors?.username}
            aria-describedby={errors?.username ? "username-error" : undefined}
            className={inputClass}
          />
          <FieldError id="username-error" message={errors?.username} />
        </div>
      )}

      <div>
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          defaultValue={state?.values?.email}
          aria-invalid={!!errors?.email}
          aria-describedby={errors?.email ? "email-error" : undefined}
          className={inputClass}
        />
        <FieldError id="email-error" message={errors?.email} />
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-medium">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
          minLength={isSignup ? 8 : undefined}
          maxLength={128}
          placeholder={isSignup ? "At least 8 characters" : "Your password"}
          aria-invalid={!!errors?.password}
          aria-describedby={errors?.password ? "password-error" : undefined}
          className={inputClass}
        />
        <FieldError id="password-error" message={errors?.password} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-base sm:py-2.5 sm:text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-60 dark:focus-visible:ring-offset-zinc-950"
      >
        {pending ? (isSignup ? "Creating account…" : "Logging in…") : isSignup ? "Create account" : "Log in"}
      </button>
    </form>
  );
}
