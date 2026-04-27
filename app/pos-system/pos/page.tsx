"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import PosPageShell from "../_components/pos-page-shell";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { isAdminRole, withBranchScope } from "@/lib/branch-scope";
import SmartImage from "@/app/_components/smart-image";

type Menu = {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category_name?: string;
};

type MenuRow = {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category?: {
    name?: string;
  } | null;
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

type PageStatus = "loading" | "success" | "error";
type CheckoutNotice = {
  tone: "success" | "warning";
  message: string;
};

export default function POSPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [pageError, setPageError] = useState<string | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<CheckoutNotice | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const loadMenus = useCallback(async () => {
    if (!isAdminRole(user) && !user?.branch_id) return;

    const menuQuery = supabase.from("menus").select(`
      *,
      category:categories(name)
    `);

    const { data, error } = await withBranchScope(menuQuery, user);

    if (error) {
      setPageStatus("error");
      setPageError(error.message || "Failed to load menu");
      return;
    }

    const mappedMenus = ((data as MenuRow[]) || []).map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url,
      category_name: item.category?.name || "Uncategorized",
    }));

    setPageError(null);
    setMenus(mappedMenus);
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
      void loadMenus();
    }, 0);

    return () => clearTimeout(timer);
  }, [authLoading, user, router, loadMenus]);

  function addToCart(menu: Menu) {
    setCheckoutNotice(null);
    const existingItem = cart.find((item) => item.id === menu.id);

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === menu.id ? { ...item, qty: item.qty + 1 } : item
        )
      );
      return;
    }

    setCart([
      ...cart,
      { id: menu.id, name: menu.name, price: menu.price, qty: 1 },
    ]);
  }

  function getTotal() {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  async function checkout() {
    if (cart.length === 0) {
      setCheckoutNotice({
        tone: "warning",
        message: "Add at least one item before sending the order.",
      });
      return;
    }

    if (!user?.branch_id) {
      setCheckoutNotice({
        tone: "warning",
        message: "Select a branch before creating an order.",
      });
      return;
    }

    setIsCheckingOut(true);
    setCheckoutNotice(null);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert([
        { total: getTotal(), branch_id: user.branch_id, status: "PREPARING" },
      ])
      .select()
      .single();

    if (orderError || !order) {
      console.log("ORDER ERROR:", orderError);
      setCheckoutNotice({
        tone: "warning",
        message: orderError?.message || "Unable to create the order.",
      });
      setIsCheckingOut(false);
      return;
    }

    const items = cart.map((item) => ({
      order_id: order.id,
      menu_id: item.id,
      quantity: item.qty,
      price: item.price,
      branch_id: user.branch_id,
    }));

    const { error: itemError } = await supabase.from("order_items").insert(items);

    if (itemError) {
      console.log(itemError);
      setCheckoutNotice({
        tone: "warning",
        message: "The order was created, but the items could not be saved.",
      });
      setIsCheckingOut(false);
      return;
    }

    setCheckoutNotice({
      tone: "success",
      message: "Order sent successfully.",
    });
    setIsCheckingOut(false);
    setCart([]);
  }

  function handleRetry() {
    setPageStatus("loading");
    setPageError(null);
    void loadMenus();
  }

  if (authLoading || pageStatus === "loading") {
    return <div className="p-4 text-slate-600">Loading menu items...</div>;
  }

  if (pageStatus === "error") {
    return (
      <div className="p-4">
        <div className="max-w-xl rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-800">Failed to load menus</p>
          <p className="mt-1 text-sm text-red-700">{pageError}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-3 rounded-xl bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const categoryOptions = [
    "ALL",
    ...Array.from(
      new Set(menus.map((menu) => menu.category_name || "Uncategorized"))
    ).sort((a, b) => a.localeCompare(b)),
  ];

  const visibleMenus =
    selectedCategory === "ALL"
      ? menus
      : menus.filter(
          (menu) => (menu.category_name || "Uncategorized") === selectedCategory
        );

  return (
    <PosPageShell
      title="POS"
      description="Create an order, review the item list, and send it to the branch."
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_360px]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((category) => {
              const isActive = selectedCategory === category;
              const label = category === "ALL" ? "All items" : category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={[
                    "rounded-xl border px-4 py-2 text-sm font-medium transition",
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-500",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleMenus.length === 0 ? (
              <div className="sm:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-slate-600">
                No menu items in this category.
              </div>
            ) : (
              visibleMenus.map((menu) => (
                <button
                  key={menu.id}
                  type="button"
                  onClick={() => addToCart(menu)}
                  className="overflow-hidden rounded-2xl border border-slate-300 bg-white text-left transition hover:border-slate-500"
                >
                  <div className="relative h-36 w-full">
                    <SmartImage
                      src={menu.image_url}
                      alt={menu.name}
                      fill
                      sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-semibold text-slate-950">{menu.name}</h2>
                      <span className="text-sm font-semibold text-slate-950">
                        THB {menu.price}
                      </span>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                      {menu.category_name}
                    </p>
                    <p className="text-sm text-slate-600">Tap to add to order</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-300 bg-white p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Order
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Order summary
            </h2>
          </div>

          {checkoutNotice ? (
            <div
              className={[
                "rounded-xl border px-3 py-2 text-sm",
                checkoutNotice.tone === "success"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-amber-300 bg-amber-50 text-amber-800",
              ].join(" ")}
            >
              {checkoutNotice.message}
            </div>
          ) : null}

          {cart.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
              No items in this order yet.
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <span>
                  {item.name} x{item.qty}
                </span>
                <span>THB {item.price * item.qty}</span>
              </div>
            ))
          )}

          <hr className="border-slate-200" />
          <h3 className="text-xl font-semibold text-slate-950">
            Total: THB {getTotal()}
          </h3>

          <button
            onClick={checkout}
            disabled={isCheckingOut}
            className="w-full rounded-2xl bg-slate-950 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            {isCheckingOut ? "Sending order..." : "Send order"}
          </button>
        </div>
      </div>
    </PosPageShell>
  );
}
