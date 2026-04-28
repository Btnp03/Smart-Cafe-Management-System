"use client";

import { Suspense, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "../_components/auth-shell";
import { useAuth } from "../context/AuthContext";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);
  const requestedPath = searchParams.get("next");
  const nextPath =
    requestedPath && requestedPath.startsWith("/") ? requestedPath : "/dashboard";

  useEffect(() => {
    if (!loading && user) {
      router.replace(nextPath);
    }
  }, [loading, nextPath, router, user]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);
    setStatusType(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setStatusType("error");
      setStatusMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    setStatusType("success");
    setStatusMessage("Signed in. Redirecting...");
    router.replace(nextPath);
    router.refresh();
  }

  return (
    <AuthShell
      eyebrow="Sign in"
      title="Sign in to Smart Cafe."
      description="Use your staff account to access sales, menu, and branch operations."
      footerText="Need a new account?"
      footerLinkLabel="Register"
      footerLinkHref="/register"
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Smart Cafe
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
            Login
          </h2>
          <p className="text-sm text-slate-500">
            Enter your email and password to continue.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {statusMessage ? (
            <div
              className={[
                "rounded-xl border px-4 py-3 text-sm",
                statusType === "success"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-red-300 bg-red-50 text-red-800",
              ].join(" ")}
            >
              {statusMessage}
            </div>
          ) : null}

          <input
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-900 focus:bg-white"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-900 focus:bg-white"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            disabled={isSubmitting || loading}
            className="w-full rounded-2xl bg-slate-950 px-6 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            {isSubmitting || loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
