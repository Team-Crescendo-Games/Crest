"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      setLoading(false);

      if (result?.error) {
        setError(
          "Account created but sign-in failed. Please sign in manually.",
        );
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg-elevated/80 p-8 shadow-[0_0_40px_-12px] shadow-accent/15 backdrop-blur-sm">
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <Logo size={32} />
              <h1 className="font-mono text-xl font-semibold tracking-tight text-accent">
                Crest
              </h1>
            </div>
            <ThemeToggle />
          </div>

          <div>
            <div className="h-px w-12 bg-linear-to-r from-accent-subtle to-transparent" />
            <p className="mt-3 text-xs text-fg-muted">
              Create your account to get started
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md border border-accent-emphasis/30 bg-accent-emphasis/10 px-3 py-2 text-xs text-accent-emphasis">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="name"
                className="block text-xs font-medium text-fg-secondary"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1.5 block w-full rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary placeholder-fg-muted transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
                placeholder="Your name"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-fg-secondary"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1.5 block w-full rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary placeholder-fg-muted transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-fg-secondary"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="mt-1.5 block w-full rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary placeholder-fg-muted transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
                placeholder="At least 8 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg-primary transition-all hover:bg-accent-emphasis hover:shadow-[0_0_20px_-4px] hover:shadow-accent/40 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-elevated disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] text-fg-muted">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <p className="text-center text-xs text-fg-muted">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="font-medium text-accent transition-colors hover:text-accent-emphasis"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
