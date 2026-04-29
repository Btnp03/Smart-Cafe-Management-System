"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import PosPageShell from "../_components/pos-page-shell";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { isAdminRole, withBranchScope } from "@/lib/branch-scope";

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  sweetness?: string | null;
  toppings?: string[] | null;
  special_instructions?: string | null;
  menus?: {
    name: string;
  } | null;
};

type Order = {
  id: string;
  total: number;
  created_at: string;
  order_items?: OrderItem[];
};

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pageStatus, setPageStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getOrders = useCallback(async () => {
    if (!isAdminRole(user) && !user?.branch_id) return;

    setPageStatus("loading");
    setErrorMessage(null);

    const ordersQuery = supabase.from("orders").select(`
      *,
      order_items(
        id,
        quantity,
        price,
        sweetness,
        toppings,
        special_instructions,
        menus(name)
      )
    `);
    const { data, error } = await withBranchScope(ordersQuery, user).order(
      "created_at",
      { ascending: false }
    );

    if (error) {
      setPageStatus("error");
      setErrorMessage(error.message || "Failed to load orders");
      return;
    }

    setOrders((data as Order[]) || []);
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
      void getOrders();
    }, 0);

    return () => clearTimeout(timer);
  }, [authLoading, user, router, getOrders]);

  return (
    <PosPageShell
      title="Order History"
      description="Review the latest transactions in a cleaner chronological list."
    >
      <div className="mx-auto max-w-4xl space-y-4">
        {pageStatus === "loading" ? (
          <div className="rounded-[20px] border border-slate-300 bg-white p-4 text-slate-600">
            Loading orders...
          </div>
        ) : null}

        {pageStatus === "error" ? (
          <div className="rounded-[20px] border border-red-200 bg-red-50 p-4">
            <p className="font-medium text-red-800">Failed to load orders</p>
            <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
            <button
              onClick={() => void getOrders()}
              className="mt-3 rounded-xl bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              Retry
            </button>
          </div>
        ) : null}

        {pageStatus === "success" && orders.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-slate-300 bg-white p-5 text-slate-600">
            No orders found yet.
          </div>
        ) : null}

        {orders.map((order) => (
          <div
            key={order.id}
            className="rounded-[28px] border border-slate-300 bg-slate-50 p-5 shadow-[0_16px_35px_rgba(15,23,42,0.05)]"
          >
            <p className="text-sm text-slate-500">Order ID</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">
              {order.id}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <p className="text-sm text-slate-600">Total: THB {order.total}</p>
              <p className="text-sm text-slate-600">
                Date: {new Date(order.created_at).toLocaleString()}
              </p>
            </div>

            <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-800">Items</p>
              {!order.order_items || order.order_items.length === 0 ? (
                <p className="text-sm text-slate-500">No item details found.</p>
              ) : (
                order.order_items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-900">
                        {item.menus?.name || "Unknown menu"} x {item.quantity}
                      </p>
                      <p className="text-sm text-slate-600">
                        THB {item.price * item.quantity}
                      </p>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-slate-500">
                      {item.sweetness ? <p>Sweetness: {item.sweetness}</p> : null}
                      {item.toppings && item.toppings.length > 0 ? (
                        <p>Toppings: {item.toppings.join(", ")}</p>
                      ) : null}
                      {item.special_instructions ? (
                        <p>Note: {item.special_instructions}</p>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </PosPageShell>
  );
}
