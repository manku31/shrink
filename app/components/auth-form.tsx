"use client";

type Props = {
  mode: "login" | "signup";
};

const inputClass =
  "mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export function AuthForm({ mode }: Props) {
  const isSignup = mode === "signup";

  return (
    <form
      className="space-y-4"
      // UI only for now: authentication will be wired up later.
      onSubmit={(e) => e.preventDefault()}
    >
      {isSignup && (
        <div>
          <label htmlFor="name" className="text-sm font-medium">Full name</label>
          <input id="name" name="name" type="text" autoComplete="name" required placeholder="Jane Doe" className={inputClass} />
        </div>
      )}
      <div>
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" className={inputClass} />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          {!isSignup && (
            <a href="#" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">Forgot password?</a>
          )}
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
          minLength={isSignup ? 8 : undefined}
          placeholder={isSignup ? "At least 8 characters" : "Your password"}
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
      >
        {isSignup ? "Create account" : "Log in"}
      </button>
    </form>
  );
}
