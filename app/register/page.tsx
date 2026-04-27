"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import AuthShell from "../_components/auth-shell";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatusMessage(null);
    setStatusType(null);

    if (password !== confirmPassword) {
      setStatusType("error");
      setStatusMessage("Password and Confirm Password must match.");
      return;
    }

    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setStatusType("error");
      setStatusMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    const authUser = data.user;
    if (!authUser) {
      setStatusType("error");
      setStatusMessage("Auth user not found");
      setIsSubmitting(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert([
      {
        id: authUser.id,
        email,
        name,
        phone,
        role: "staff",
        branch_id: null,
      },
    ]);

    if (profileError) {
      setStatusType("error");
      setStatusMessage(profileError.message);
      setIsSubmitting(false);
      return;
    }

    setStatusType("success");
    setStatusMessage("Account created. Redirecting to sign in...");
    router.push("/login");
  }

  return (
    <AuthShell
      eyebrow="Create account"
      title="Create a staff account for Smart Cafe."
      description="Register a staff user, then assign branch access after the account is created."
      footerText="Already have an account?"
      footerLinkLabel="Sign in"
      footerLinkHref="/login"
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Smart Cafe
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
            Register
          </h2>
          <p className="text-sm text-slate-500">
            Enter the staff details below.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
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
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-900 focus:bg-white"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <input
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-900 focus:bg-white"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-900 focus:bg-white"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-900 focus:bg-white"
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <button
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-slate-950 px-6 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            {isSubmitting ? "Creating account..." : "Register"}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
