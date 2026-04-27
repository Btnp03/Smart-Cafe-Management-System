"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

type Branch = {
  id: string;
  branch_name: string;
};

export default function SelectBranchPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingBranchId, setSavingBranchId] = useState<string | null>(null);
  const router = useRouter();

  async function getBranches() {
    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase.from("branch").select("*");
    if (error) {
      setErrorMessage(error.message || "Failed to load branches");
      setLoading(false);
      return;
    }

    setBranches((data as Branch[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void getBranches();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  async function chooseBranch(branch_id: string) {
    setSavingBranchId(branch_id);
    setErrorMessage(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      setErrorMessage("Session not found. Please login again.");
      setSavingBranchId(null);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ branch_id })
      .eq("id", user.id);

    if (error) {
      setErrorMessage(error.message || "Failed to select branch");
      setSavingBranchId(null);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="px-6 py-8 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-[32px] border border-slate-300 bg-white/88 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Branch setup
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
                Choose the branch you want to operate from
              </h1>
              <p className="max-w-2xl text-slate-600">
                Set the active branch before entering daily operations so sales,
                menus, and queue data stay aligned with the correct location.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              {loading ? "Loading branches..." : `${branches.length} branches available`}
            </div>
          </div>
        </section>

        {errorMessage ? (
          <section className="rounded-[24px] border border-red-200 bg-red-50 p-5">
            <p className="font-medium text-red-800">Cannot load branches</p>
            <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
            <button
              onClick={() => void getBranches()}
              className="mt-3 rounded-xl bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              Retry
            </button>
          </section>
        ) : null}

        {loading ? (
          <section className="rounded-[24px] border border-slate-300 bg-white/92 p-6 text-slate-600">
            Loading branches...
          </section>
        ) : null}

        {!loading && branches.length === 0 ? (
          <section className="rounded-[24px] border border-dashed border-slate-300 bg-white/92 p-6 text-slate-600">
            No branches available yet.
          </section>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => chooseBranch(b.id)}
              disabled={savingBranchId !== null}
              className="group rounded-[28px] border border-slate-300 bg-white/92 p-6 text-left shadow-[0_22px_50px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-slate-900 hover:shadow-[0_28px_65px_rgba(15,23,42,0.1)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Branch
              </p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                {b.branch_name}
              </h2>
              <p className="mt-3 text-sm text-slate-500">
                Click to activate this branch and enter the workspace.
              </p>
              <div className="mt-6 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition group-hover:bg-slate-800">
                {savingBranchId === b.id ? "Applying..." : "Use this branch"}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
