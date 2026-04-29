"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { isAdminRole } from "@/lib/branch-scope";

type KitchenOrderItem = {
  quantity: number;
  price?: number;
  sweetness?: string | null;
  toppings?: string[] | null;
  special_instructions?: string | null;
  menus?: {
    name: string;
  } | null;
};

type OrderStatus = "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";

type KitchenOrder = {
  id: string;
  status: OrderStatus;
  created_at: string;
  total?: number;
  order_items: KitchenOrderItem[];
};

type KitchenOrderBase = Omit<KitchenOrder, "order_items">;

type RawItem = {
  order_id: string;
  quantity: number;
  price?: number;
  sweetness?: string | null;
  toppings?: string[] | null;
  special_instructions?: string | null;
  menus?: { name: string } | { name: string }[] | null;
};

function getStatusMeta(status: OrderStatus) {
  switch (status) {
    case "PREPARING":
      return {
        label: "Preparing",
        badgeClass:
          "border-amber-300 bg-amber-50 text-amber-800",
        actionLabel: "Mark ready",
        nextStatus: "READY" as OrderStatus,
        actionClass:
          "bg-slate-700 text-white hover:bg-slate-600",
      };
    case "READY":
      return {
        label: "Ready",
        badgeClass:
          "border-emerald-300 bg-emerald-50 text-emerald-800",
        actionLabel: "Complete order",
        nextStatus: "COMPLETED" as OrderStatus,
        actionClass:
          "bg-emerald-700 text-white hover:bg-emerald-600",
      };
    case "COMPLETED":
      return {
        label: "Completed",
        badgeClass:
          "border-slate-300 bg-slate-100 text-slate-700",
        actionLabel: "",
        nextStatus: null,
        actionClass: "",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        badgeClass:
          "border-red-300 bg-red-50 text-red-800",
        actionLabel: "",
        nextStatus: null,
        actionClass: "",
      };
  }
}

export default function KitchenPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [pageStatus, setPageStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const loadOrders = useCallback(async (options?: { silent?: boolean }) => {
    if (!isAdminRole(user) && !user?.branch_id) return;
    const branchId = user?.branch_id ?? null;

    if (!options?.silent) {
      setPageStatus("loading");
      setErrorMessage(null);
    }

    const ordersQuery = isAdminRole(user)
      ? supabase.from("orders").select(`
        id,
        status,
        created_at,
        total
      `)
      : supabase
          .from("orders")
          .select(`
        id,
        status,
        created_at,
        total
      `)
          .eq("branch_id", branchId!);
    const { data, error } = await ordersQuery
      .in("status", ["PREPARING", "READY"])
      .order("created_at", { ascending: true });

    if (error) {
      setPageStatus("error");
      setErrorMessage(error.message || "Failed to load kitchen orders");
      return;
    }

    const baseOrders = ((data as KitchenOrderBase[] | null) || []).map((order) => ({
      ...order,
      order_items: [],
    }));

    if (baseOrders.length === 0) {
      setOrders([]);
      setPageStatus("success");
      return;
    }

    const orderIds = baseOrders.map((order) => order.id);
    const { data: itemData, error: itemError } = await supabase
      .from("order_items")
      .select(`
        order_id,
        quantity,
        price,
        sweetness,
        toppings,
        special_instructions,
        menus(name)
      `)
      .in("order_id", orderIds);

    if (itemError) {
      setPageStatus("error");
      setErrorMessage(itemError.message || "Failed to load order items");
      return;
    }

    const itemMap = new Map<string, KitchenOrderItem[]>();
    ((itemData as unknown as RawItem[]) || []).forEach((item) => {
      const existing = itemMap.get(item.order_id) || [];
      const menuRecord = Array.isArray(item.menus) ? item.menus[0] : item.menus;
      existing.push({
        quantity: item.quantity,
        price: item.price,
        sweetness: item.sweetness,
        toppings: item.toppings,
        special_instructions: item.special_instructions,
        menus: menuRecord || null,
      });
      itemMap.set(item.order_id, existing);
    });

    const mergedOrders = baseOrders.map((order) => ({
      ...order,
      order_items: itemMap.get(order.id) || [],
    }));

    mergedOrders.sort((left, right) => {
      const rank: Record<OrderStatus, number> = {
        PREPARING: 0,
        READY: 1,
        COMPLETED: 2,
        CANCELLED: 3,
      };
      return rank[left.status] - rank[right.status];
    });

    setOrders(mergedOrders);
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
    const startupTimer = setTimeout(() => {
      void loadOrders();
    }, 0);

    const interval = setInterval(() => {
      void loadOrders({ silent: true });
    }, 3000);

    return () => {
      clearTimeout(startupTimer);
      clearInterval(interval);
    };
  }, [authLoading, user, router, loadOrders]);

  async function updateStatus(id: string, newStatus: OrderStatus) {
    if (!isAdminRole(user) && !user?.branch_id) return;
    const branchId = user?.branch_id ?? null;
    setUpdatingOrderId(id);
    setActionMessage(null);

    const updateQuery = isAdminRole(user)
      ? supabase
          .from("orders")
          .update({ status: newStatus })
          .eq("id", id)
          .select("id, status")
          .maybeSingle()
      : supabase
          .from("orders")
          .update({ status: newStatus })
          .eq("id", id)
          .eq("branch_id", branchId!)
          .select("id, status")
          .maybeSingle();
    const { data: updatedOrder, error } = await updateQuery;

    if (error) {
      setActionMessage(error.message || "Failed to update order status");
      setUpdatingOrderId(null);
      return;
    }

    if (!updatedOrder) {
      setActionMessage("No matching order was updated.");
      setUpdatingOrderId(null);
      return;
    }

    setOrders((currentOrders) =>
      currentOrders
        .map((order) =>
          order.id === id ? { ...order, status: newStatus } : order
        )
        .filter(
          (order) => order.status === "PREPARING" || order.status === "READY"
        )
    );

    const nextLabel = getStatusMeta(newStatus).label.toLowerCase();
    setActionMessage(`Order #${id.slice(0, 6)} moved to ${nextLabel}.`);
    setUpdatingOrderId(null);
    await loadOrders({ silent: true });
  }

  return (
    <div className="px-6 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[32px] border border-slate-300 bg-white/88 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Kitchen queue
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Live preparation board
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Track active kitchen orders and move each ticket from preparing to
            ready before closing the order.
          </p>
        </section>

        {actionMessage ? (
          <section className="rounded-2xl border border-slate-300 bg-white p-4 text-sm text-slate-700">
            {actionMessage}
          </section>
        ) : null}

        {pageStatus === "loading" ? (
          <section className="rounded-2xl border border-slate-300 bg-white p-6 text-slate-600">
            Loading kitchen queue...
          </section>
        ) : null}

        {pageStatus === "error" ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="font-medium text-red-800">Failed to load kitchen queue</p>
            <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
            <button
              onClick={() => void loadOrders()}
              className="mt-3 rounded-xl bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              Retry
            </button>
          </section>
        ) : null}

        {pageStatus === "success" && orders.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
            No active kitchen orders. Completed orders are removed from this board.
          </section>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-3">
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-[28px] border border-slate-300 bg-white/92 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]"
            >
              {(() => {
                const statusMeta = getStatusMeta(order.status);
                return (
                  <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500">Order</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    #{order.id.slice(0, 6)}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em]",
                    statusMeta.badgeClass,
                  ].join(" ")}
                >
                  {statusMeta.label}
                </span>
              </div>
              
              <div className="mt-6 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                {order.order_items.length === 0 ? (
                  <p className="text-sm text-slate-500">No items in this order.</p>
                ) : (
                  order.order_items.map((item, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-slate-700">
                          {item.menus?.name || "Unknown menu"} x {item.quantity}
                        </p>
                        <p className="text-sm font-medium text-slate-600">
                          {item.price ? `THB ${item.price * item.quantity}` : ""}
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

              <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-sm text-slate-500">
                  Items: {order.order_items.reduce((sum, item) => sum + item.quantity, 0)}
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  Total: THB {order.total ?? 0}
                </p>
              </div>

              <div className="mt-6">
                {statusMeta.nextStatus ? (
                  <button
                    onClick={() => updateStatus(order.id, statusMeta.nextStatus)}
                    disabled={updatingOrderId === order.id}
                    className={[
                      "rounded-2xl px-4 py-3 font-medium transition disabled:cursor-not-allowed disabled:bg-slate-300",
                      statusMeta.actionClass,
                    ].join(" ")}
                  >
                    {updatingOrderId === order.id ? "Updating..." : statusMeta.actionLabel}
                  </button>
                ) : null}
              </div>
                  </>
                );
              })()}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
