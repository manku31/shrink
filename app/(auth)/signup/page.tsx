import type { Metadata } from "next";
import { AuthShell } from "../../components/auth-shell";
import { AuthForm } from "../../components/auth-form";

export const metadata: Metadata = { title: "Sign up – TaskFlow" };

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Free forever for individuals. No credit card needed."
      footerText="Already have an account?"
      footerLinkLabel="Log in"
      footerHref="/login"
    >
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
