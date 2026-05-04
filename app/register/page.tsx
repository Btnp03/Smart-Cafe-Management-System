"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import AuthShell from "../_components/auth-shell";
import { useAuth } from "../context/AuthContext";

type Branch = {
  id: string;
  branch_name: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
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

  useEffect(() => {
    let isMounted = true;

    async function loadBranches() {
      setIsLoadingBranches(true);

      const { data, error } = await supabase
        .from("branch")
        .select("id, branch_name")
        .order("branch_name", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (error) {
        setStatusType("error");
        setStatusMessage(error.message || "Failed to load branches.");
        setBranches([]);
        setIsLoadingBranches(false);
        return;
      }

      setBranches((data as Branch[]) || []);
      setIsLoadingBranches(false);
    }

    void loadBranches();

    return () => {
      isMounted = false;
    };
  }, []);

  function handlePhoneChange(value: string) {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 10);

    if (!digitsOnly) {
      setPhone("");
      return;
    }

    if (digitsOnly[0] !== "0") {
      return;
    }

    setPhone(digitsOnly);
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatusMessage(null);
    setStatusType(null);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();
    const normalizedPhone = phone.trim();

    if (password !== confirmPassword) {
      setStatusType("error");
      setStatusMessage("Password and Confirm Password must match.");
      return;
    }

    if (!selectedBranchId) {
      setStatusType("error");
      setStatusMessage("Please select a branch.");
      return;
    }

    if (!/^0\d{9}$/.test(normalizedPhone)) {
      setStatusType("error");
      setStatusMessage("Phone number must start with 0 and contain 10 digits.");
      return;
    }

    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
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

    const { error: profileError } = await supabase.from("profiles").upsert(
      [
        {
          id: authUser.id,
          email: normalizedEmail,
          name: normalizedName,
          phone: normalizedPhone,
          role: "staff",
          branch_id: selectedBranchId,
        },
      ],
      { onConflict: "id" }
    );

    if (profileError) {
      setStatusType("error");
      setStatusMessage(profileError.message);
      setIsSubmitting(false);
      return;
    }

    setStatusType("success");
    setStatusMessage("Account created. Redirecting to sign in...");
    router.replace("/login");
    router.refresh();
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
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
          />

          <select
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-900 focus:bg-white"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            disabled={isLoadingBranches || branches.length === 0}
          >
            <option value="">
              {isLoadingBranches
                ? "Loading branches..."
                : branches.length === 0
                  ? "No branches available"
                  : "Select Branch"}
            </option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.branch_name}
              </option>
            ))}
          </select>

          <input
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-900 focus:bg-white"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-900 focus:bg-white"
            type="password"
            placeholder="Password (min 6 characters)"
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
            disabled={isSubmitting || isLoadingBranches || branches.length === 0}
            className="w-full rounded-2xl bg-slate-950 px-6 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            {isSubmitting ? "Creating account..." : "Register"}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
