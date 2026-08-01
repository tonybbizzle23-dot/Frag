import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "~/auth-context";
import { AuthShell, authInputClass } from "~/components/AuthShell";

export const Route = createFileRoute("/auth/signup")({
  component: SignupPage,
});

function SignupPage() {
  const { user, isLoading, signup } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirm?: string;
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

    const errors: { email?: string; password?: string; confirm?: string } = {};
    const trimmed = email.trim();
    if (!trimmed) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      errors.email = "Enter a valid email address.";
    }
    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }
    if (!confirm) {
      errors.confirm = "Please confirm your password.";
    } else if (confirm !== password) {
      errors.confirm = "Passwords do not match.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await signup(trimmed, password);
      navigate({ to: "/app" });
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Signup failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AuthShell title="Create your account" subtitle="Checking your session…" footer={null}>
        <p className="text-sm text-gray-2">Loading…</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free forever. Clip like a pro in seconds."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/auth/login"
            className="font-semibold text-frag-orange transition-colors hover:text-[#FF7A33]"
          >
            Log in
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
            htmlFor="signup-email"
            className="font-subheading text-sm font-semibold text-gray-1"
          >
            Email
          </label>
          <input
            id="signup-email"
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
            htmlFor="signup-password"
            className="font-subheading text-sm font-semibold text-gray-1"
          >
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            placeholder="At least 8 characters"
            className={`${authInputClass} ${
              fieldErrors.password ? "border-kill-red" : "border-gray-3"
            }`}
            aria-invalid={Boolean(fieldErrors.password)}
          />
          {fieldErrors.password && (
            <p className="text-sm text-kill-red">{fieldErrors.password}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="signup-confirm"
            className="font-subheading text-sm font-semibold text-gray-1"
          >
            Confirm password
          </label>
          <input
            id="signup-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              if (fieldErrors.confirm) {
                setFieldErrors((prev) => ({ ...prev, confirm: undefined }));
              }
            }}
            placeholder="Repeat your password"
            className={`${authInputClass} ${
              fieldErrors.confirm ? "border-kill-red" : "border-gray-3"
            }`}
            aria-invalid={Boolean(fieldErrors.confirm)}
          />
          {fieldErrors.confirm && (
            <p className="text-sm text-kill-red">{fieldErrors.confirm}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-sm bg-frag-orange px-6 py-3 font-body text-sm font-semibold text-white transition-all hover:bg-[#FF7A33] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>

        <p className="text-xs text-gray-3">
          By signing up you agree to start clipping — no spam, ever.
        </p>
      </form>
    </AuthShell>
  );
}
