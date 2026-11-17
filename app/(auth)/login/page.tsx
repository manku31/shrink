import type { Metadata } from "next";
import { AuthShell } from "../../components/auth-shell";
import { AuthForm } from "../../components/auth-form";

export const metadata: Metadata = { title: "Log in – Shrink" };

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to pick up where you left off."
      footerText="New to Shrink?"
      footerLinkLabel="Sign up"
      footerHref="/signup"
    >
      <AuthForm mode="login" />
    </AuthShell>
  );
}
