"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SetPasswordPage() {
  const [step, setStep] = useState<"email" | "password" | "done">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/set-password/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
    } else {
      setStep("password");
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
    } else {
      setStep("done");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg-elevated/80 p-8 shadow-[0_0_40px_-12px] shadow-accent/15 backdrop-blur-sm">
        <div className="flex items-center gap-2.5 mb-6">
          <Logo size={28} />
          <h1 className="font-mono text-lg font-semibold tracking-tight text-accent">
            Set Password
          </h1>
        </div>

        {step === "email" && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <p className="text-xs text-fg-muted">
              Enter your email to set a password for your migrated account.
            </p>

            {error && (
              <div className="rounded-md border border-accent-emphasis/30 bg-accent-emphasis/10 px-3 py-2 text-xs text-accent-emphasis">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-fg-secondary">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1.5 block w-full rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
                placeholder="you@company.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg-primary hover:bg-accent-emphasis disabled:opacity-50"
            >
              {loading ? "Checking..." : "Continue"}
            </button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <p className="text-xs text-fg-muted">
              Setting password for{" "}
              <span className="text-fg-primary">{email}</span>
            </p>

            {error && (
              <div className="rounded-md border border-accent-emphasis/30 bg-accent-emphasis/10 px-3 py-2 text-xs text-accent-emphasis">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-fg-secondary">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="At least 8 characters"
                className="mt-1.5 block w-full rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-fg-secondary">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="mt-1.5 block w-full rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg-primary hover:bg-accent-emphasis disabled:opacity-50"
            >
              {loading ? "Setting..." : "Set Password"}
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-fg-primary">
              Password set successfully.
            </p>
            <Link
              href="/sign-in"
              className="block w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg-primary hover:bg-accent-emphasis"
            >
              Sign in
            </Link>
          </div>
        )}

        {step !== "done" && (
          <p className="mt-4 text-center text-xs text-fg-muted">
            Already have a password?{" "}
            <Link
              href="/sign-in"
              className="text-accent hover:text-accent-emphasis"
            >
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
