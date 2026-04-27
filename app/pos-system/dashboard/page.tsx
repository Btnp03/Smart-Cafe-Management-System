"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PosPageShell from "../_components/pos-page-shell";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { isAdminRole } from "@/lib/branch-scope";

type OrderStatsRow = {
  total: number;
};

type MenuStatsRow = {
  id: string;
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [pageStatus, setPageStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    products: 0,
    avg: 0,
  });

  const loadStats = useCallback(async () => {
    if (!isAdminRole(user) && !user?.branch_id) return;
    const branchId = user?.branch_id ?? null;

    setPageStatus("loading");
    setErrorMessage(null);

    const ordersQuery = isAdminRole(user)
      ? supabase.from("orders").select("total")
      : supabase.from("orders").select("total").eq("branch_id", branchId!);
    const { data: orders, error: ordersError } = await ordersQuery;

    if (ordersError) {
      setPageStatus("error");
      setErrorMessage(ordersError.message || "Failed to load order stats");
      return;
    }

    const menusQuery = isAdminRole(user)
      ? supabase.from("menus").select("id")
      : supabase.from("menus").select("id").eq("branch_id", branchId!);
    const { data: menus, error: menusError } = await menusQuery;

    if (menusError) {
      setPageStatus("error");
      setErrorMessage(menusError.message || "Failed to load product stats");
      return;
    }

    const revenue =
      (orders as OrderStatsRow[] | null)?.reduce(
        (sum: number, order) => sum + order.total,
        0
      ) ?? 0;
    const orderCount = orders?.length ?? 0;
    const avg = orderCount ? revenue / orderCount : 0;

    setStats({
      revenue,
      orders: orderCount,
      products: (menus as MenuStatsRow[] | null)?.length ?? 0,
      avg,
    });
    setPageStatus("success");
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!isAdminRole(user) && !user.branch_id) {
      router.push("/select-branch");
      return;
    }

    const timer = setTimeout(() => {
      void loadStats();
    }, 0);

    return () => clearTimeout(timer);
  }, [authLoading, user, router, loadStats]);

  return (
    <PosPageShell
      title="Dashboard"
      description="Track revenue, order volume, and product availability from the sales workspace."
    >
      {pageStatus === "loading" ? (
        <div className="mb-4 rounded-2xl border border-slate-300 bg-white p-4 text-slate-600">
          Loading dashboard stats...
        </div>
      ) : null}

      {pageStatus === "error" ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-800">Failed to load dashboard</p>
          <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
          <button
            onClick={() => void loadStats()}
            className="mt-3 rounded-xl bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Revenue" value={`THB ${stats.revenue}`} />
        <Card title="Orders" value={stats.orders} />
        <Card title="Products" value={stats.products} />
        <Card title="Average order" value={`THB ${stats.avg.toFixed(0)}`} />
      </div>
    </PosPageShell>
  );
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-[28px] border border-slate-300 bg-slate-50 p-6 shadow-[0_16px_35px_rgba(15,23,42,0.05)]">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </h2>
    </div>
  );
}
