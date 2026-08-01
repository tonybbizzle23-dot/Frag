import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "~/auth-context";
import { AuthShell, authInputClass } from "~/components/AuthShell";

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already logged in → go straight to the app.
  useEffect(() => {
    if (!isLoading && user) {
      navigate({ to: "/app" });
    }
  }, [isLoading, user, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");

    const errors: { email?: string; password?: string } = {};
    const trimmed = email.trim();
    if (!trimmed) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      errors.email = "Enter a valid email address.";
    }
    if (!password) {
      errors.password = "Password is required.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await login(trimmed, password);
      navigate({ to: "/app" });
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Login failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AuthShell title="Log in" subtitle="Checking your session…" footer={null}>
        <p className="text-sm text-gray-2">Loading…</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to keep clipping your best moments."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            to="/auth/signup"
            className="font-semibold text-frag-orange transition-colors hover:text-[#FF7A33]"
          >
            Create one free
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {formError && (
          <p className="rounded-sm border border-kill-red/40 bg-kill-red/10 px-3 py-2 text-sm text-kill-red">
            {formError}
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="login-email"
            className="font-subheading text-sm font-semibold text-gray-1"
          >
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            placeholder="you@example.com"
            className={`${authInputClass} ${
              fieldErrors.email ? "border-kill-red" : "border-gray-3"
            }`}
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email && (
            <p className="text-sm text-kill-red">{fieldErrors.email}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="login-password"
            className="font-subheading text-sm font-semibold text-gray-1"
          >
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            placeholder="••••••••"
            className={`${authInputClass} ${
              fieldErrors.password ? "border-kill-red" : "border-gray-3"
            }`}
            aria-invalid={Boolean(fieldErrors.password)}
          />
          {fieldErrors.password && (
            <p className="text-sm text-kill-red">{fieldErrors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-sm bg-frag-orange px-6 py-3 font-body text-sm font-semibold text-white transition-all hover:bg-[#FF7A33] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>
    </AuthShell>
  );
}
