"use client";

import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { isAdminRole } from "@/lib/branch-scope";
import SmartImage from "../_components/smart-image";

type Menu = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
};

type OrderSummary = {
  total: number;
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [pageStatus, setPageStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [todaySales, setTodaySales] = useState(0);

  const loadDashboard = useCallback(async () => {
    if (!isAdminRole(user) && !user?.branch_id) return;
    const branchId = user?.branch_id ?? null;

    setPageStatus("loading");
    setErrorMessage(null);

    const menuQuery = isAdminRole(user)
      ? supabase.from("menus").select("*")
      : supabase.from("menus").select("*").eq("branch_id", branchId!);
    const { data: menuData, error: menuError } = await menuQuery.order("id", {
      ascending: false,
    });

    if (menuError) {
      setPageStatus("error");
      setErrorMessage(menuError.message || "Failed to load menu preview");
      return;
    }

    setMenus((menuData as Menu[]) || []);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const orderQuery = isAdminRole(user)
      ? supabase.from("orders").select("total")
      : supabase.from("orders").select("total").eq("branch_id", branchId!);
    const { data: orderData, error: orderError } = await orderQuery
      .gte("created_at", today.toISOString())
      .lt("created_at", tomorrow.toISOString());

    if (orderError) {
      setPageStatus("error");
      setErrorMessage(orderError.message || "Failed to load sales metrics");
      return;
    }

    const total =
      (orderData as OrderSummary[] | null)?.reduce(
        (sum: number, order) => sum + order.total,
        0
      ) ?? 0;
    setTodaySales(total);
    setPageStatus("success");
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    if (!isAdminRole(user) && !user.branch_id) {
      router.push("/select-branch");
      return;
    }

    const timer = setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => clearTimeout(timer);
  }, [user, authLoading, router, loadDashboard]);

  if (authLoading) return <div className="p-10">Loading...</div>;
  if (!user) return <div className="p-10">No user</div>;

  return (
    <div className="px-6 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[32px] border border-slate-300 bg-white/88 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Operations overview
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
                Welcome back, {user.name}
              </h1>
              <p className="max-w-2xl text-slate-600">
                Monitor sales, branch context, and menu readiness from one clean
                workspace designed for daily cafe operations.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => router.push("/pos-system/pos")}
                className="rounded-2xl bg-slate-950 px-5 py-3 font-medium text-white transition hover:bg-slate-800"
              >
                Open POS
              </button>
              <button
                onClick={() => router.push("/pos-system/orders")}
                className="rounded-2xl border border-slate-300 bg-slate-50 px-5 py-3 font-medium text-slate-900 transition hover:border-slate-900 hover:bg-white"
              >
                Order history
              </button>
            </div>
          </div>
        </section>

        {pageStatus === "error" ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="font-medium text-red-800">Unable to load dashboard</p>
            <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
            <button
              onClick={() => void loadDashboard()}
              className="mt-3 rounded-xl bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              Retry
            </button>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[28px] border border-slate-300 bg-white/92 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
            <p className="text-sm text-slate-500">Today sales</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              THB {todaySales}
            </h2>
          </div>
          <div className="rounded-[28px] border border-slate-300 bg-white/92 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
            <p className="text-sm text-slate-500">Role</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              {user.role}
            </h2>
          </div>
          <div className="rounded-[28px] border border-slate-300 bg-white/92 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
            <p className="text-sm text-slate-500">Active branch</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              {user.branch?.branch_name ?? "Not selected"}
            </h2>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-300 bg-white/88 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Menu preview
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Current cafe menu
              </h2>
            </div>
            {pageStatus === "loading" ? (
              <p className="text-sm text-slate-500">Loading menu...</p>
            ) : null}
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {pageStatus === "success" && menus.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-slate-600 md:col-span-2 xl:col-span-3">
                No menu items found for this branch.
              </div>
            ) : null}

            {menus.map((menu) => (
              <article
                key={menu.id}
                className="overflow-hidden rounded-[28px] border border-slate-300 bg-slate-50 shadow-[0_20px_40px_rgba(15,23,42,0.05)]"
              >
                <div className="relative h-44 w-full">
                  <SmartImage
                    src={menu.image_url}
                    alt={menu.name}
                    fill
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="space-y-3 p-5">
                  <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                    {menu.name}
                  </h3>
                  <p className="text-sm leading-6 text-slate-500">
                    {menu.description}
                  </p>
                  <p className="text-lg font-semibold text-slate-900">
                    THB {menu.price}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
