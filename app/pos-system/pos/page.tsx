"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import PosPageShell from "../_components/pos-page-shell";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  isAdminRole,
  MAIN_BRANCH_NAME,
  withMenuReadScope,
} from "@/lib/branch-scope";
import SmartImage from "@/app/_components/smart-image";
import {
  getMenuCustomizationPreset,
  type ToppingOption,
} from "@/lib/menu-customizations";

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
  lineId: string;
  menuId: string;
  name: string;
  basePrice: number;
  unitPrice: number;
  qty: number;
  categoryName?: string;
  sweetness?: string | null;
  toppings: string[];
  specialInstructions: string;
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
  const [mainBranchId, setMainBranchId] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<Menu | null>(null);
  const [selectedSweetness, setSelectedSweetness] = useState<string | null>(null);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState("");

  const loadMenus = useCallback(async () => {
    if (!isAdminRole(user) && !user?.branch_id) return;

    const menuQuery = withMenuReadScope(
      supabase.from("menus").select(`
      *,
      category:categories(name)
    `),
      user,
      mainBranchId
    );

    const { data, error } = await menuQuery;

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
  }, [mainBranchId, user]);

  useEffect(() => {
    async function loadMainBranch() {
      const { data } = await supabase
        .from("branch")
        .select("id")
        .eq("branch_name", MAIN_BRANCH_NAME)
        .maybeSingle();

      setMainBranchId(data?.id ?? null);
    }

    void loadMainBranch();
  }, []);

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

  function buildCustomizationKey(
    menuId: string,
    sweetness: string | null,
    toppings: string[],
    instructions: string
  ) {
    return [
      menuId,
      sweetness || "default",
      toppings.slice().sort().join("|"),
      instructions.trim().toLowerCase(),
    ].join("::");
  }

  function addConfiguredItemToCart(item: Omit<CartItem, "qty">) {
    setCheckoutNotice(null);
    const existingItem = cart.find((cartItem) => cartItem.lineId === item.lineId);

    if (existingItem) {
      setCart(
        cart.map((cartItem) =>
          cartItem.lineId === item.lineId
            ? { ...cartItem, qty: cartItem.qty + 1 }
            : cartItem
        )
      );
      return;
    }

    setCart([...cart, { ...item, qty: 1 }]);
  }

  function openCustomization(menu: Menu) {
    const preset = getMenuCustomizationPreset(menu.category_name);
    setActiveMenu(menu);
    setSelectedSweetness(preset.sweetnessOptions?.[2] ?? null);
    setSelectedToppings([]);
    setSpecialInstructions("");
  }

  function closeCustomization() {
    setActiveMenu(null);
    setSelectedSweetness(null);
    setSelectedToppings([]);
    setSpecialInstructions("");
  }

  function toggleTopping(option: ToppingOption) {
    setSelectedToppings((current) =>
      current.includes(option.label)
        ? current.filter((value) => value !== option.label)
        : [...current, option.label]
    );
  }

  function confirmCustomization() {
    if (!activeMenu) {
      return;
    }

    const preset = getMenuCustomizationPreset(activeMenu.category_name);
    const toppingPrice = (preset.toppingOptions || [])
      .filter((option) => selectedToppings.includes(option.label))
      .reduce((sum, option) => sum + option.price, 0);
    const normalizedInstructions = specialInstructions.trim();
    const lineId = buildCustomizationKey(
      activeMenu.id,
      selectedSweetness,
      selectedToppings,
      normalizedInstructions
    );

    addConfiguredItemToCart({
      lineId,
      menuId: activeMenu.id,
      name: activeMenu.name,
      basePrice: activeMenu.price,
      unitPrice: activeMenu.price + toppingPrice,
      categoryName: activeMenu.category_name,
      sweetness: selectedSweetness,
      toppings: selectedToppings,
      specialInstructions: normalizedInstructions,
    });

    closeCustomization();
  }

  function getTotal() {
    return cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
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
      menu_id: item.menuId,
      quantity: item.qty,
      price: item.unitPrice,
      branch_id: user.branch_id,
      sweetness: item.sweetness,
      toppings: item.toppings,
      special_instructions: item.specialInstructions || null,
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
                  onClick={() => openCustomization(menu)}
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
                    <p className="text-sm text-slate-600">
                      Tap to customize and add
                    </p>
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
                key={item.lineId}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {item.name} x{item.qty}
                    </p>
                    <div className="mt-1 space-y-1 text-sm text-slate-500">
                      {item.sweetness ? <p>Sweetness: {item.sweetness}</p> : null}
                      {item.toppings.length > 0 ? (
                        <p>Toppings: {item.toppings.join(", ")}</p>
                      ) : null}
                      {item.specialInstructions ? (
                        <p>Note: {item.specialInstructions}</p>
                      ) : null}
                    </div>
                  </div>
                  <span className="font-medium text-slate-900">
                    THB {item.unitPrice * item.qty}
                  </span>
                </div>
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

      {activeMenu ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8">
          <div className="w-full max-w-2xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.3)]">
            {(() => {
              const preset = getMenuCustomizationPreset(activeMenu.category_name);
              const toppingOptions = preset.toppingOptions || [];
              const toppingPrice = toppingOptions
                .filter((option) => selectedToppings.includes(option.label))
                .reduce((sum, option) => sum + option.price, 0);
              const previewTotal = activeMenu.price + toppingPrice;

              return (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Customize item
                      </p>
                      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                        {activeMenu.name}
                      </h2>
                      <p className="mt-2 text-sm text-slate-500">
                        Base price THB {activeMenu.price}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeCustomization}
                      className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-600 transition hover:border-slate-900 hover:text-slate-900"
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_280px]">
                    <div className="space-y-6">
                      {preset.sweetnessOptions ? (
                        <section className="space-y-3">
                          <p className="text-sm font-semibold text-slate-800">
                            Sweetness level
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {preset.sweetnessOptions.map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => setSelectedSweetness(option)}
                                className={[
                                  "rounded-full border px-4 py-2 text-sm font-medium transition",
                                  selectedSweetness === option
                                    ? "border-slate-900 bg-slate-900 text-white"
                                    : "border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-500",
                                ].join(" ")}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        </section>
                      ) : null}

                      {toppingOptions.length > 0 ? (
                        <section className="space-y-3">
                          <p className="text-sm font-semibold text-slate-800">
                            Toppings and extras
                          </p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {toppingOptions.map((option) => {
                              const isSelected = selectedToppings.includes(option.label);

                              return (
                                <button
                                  key={option.label}
                                  type="button"
                                  onClick={() => toggleTopping(option)}
                                  className={[
                                    "rounded-2xl border px-4 py-3 text-left transition",
                                    isSelected
                                      ? "border-slate-900 bg-slate-900 text-white"
                                      : "border-slate-300 bg-slate-50 text-slate-800 hover:border-slate-500",
                                  ].join(" ")}
                                >
                                  <p className="font-medium">{option.label}</p>
                                  <p
                                    className={[
                                      "mt-1 text-sm",
                                      isSelected ? "text-slate-200" : "text-slate-500",
                                    ].join(" ")}
                                  >
                                    + THB {option.price}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      ) : null}

                      <section className="space-y-3">
                        <label
                          htmlFor="special-instructions"
                          className="text-sm font-semibold text-slate-800"
                        >
                          Special instructions
                        </label>
                        <textarea
                          id="special-instructions"
                          value={specialInstructions}
                          onChange={(e) => setSpecialInstructions(e.target.value)}
                          rows={4}
                          placeholder={preset.notePlaceholder}
                          className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white"
                        />
                      </section>
                    </div>

                    <aside className="rounded-[28px] border border-slate-300 bg-slate-50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Order preview
                      </p>
                      <div className="mt-4 space-y-3">
                        <div className="relative h-36 overflow-hidden rounded-2xl">
                          <SmartImage
                            src={activeMenu.image_url}
                            alt={activeMenu.name}
                            fill
                            sizes="280px"
                            className="object-cover"
                          />
                        </div>
                        <p className="text-lg font-semibold text-slate-950">
                          {activeMenu.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {activeMenu.category_name}
                        </p>
                        {selectedSweetness ? (
                          <p className="text-sm text-slate-600">
                            Sweetness: {selectedSweetness}
                          </p>
                        ) : null}
                        <p className="text-sm text-slate-600">
                          Toppings:{" "}
                          {selectedToppings.length > 0
                            ? selectedToppings.join(", ")
                            : "None"}
                        </p>
                        {specialInstructions.trim() ? (
                          <p className="text-sm text-slate-600">
                            Note: {specialInstructions.trim()}
                          </p>
                        ) : null}
                      </div>

                      <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                        <div className="flex items-center justify-between text-sm text-slate-500">
                          <span>Base price</span>
                          <span>THB {activeMenu.price}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
                          <span>Extras</span>
                          <span>THB {toppingPrice}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-950">
                          <span>Unit total</span>
                          <span>THB {previewTotal}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={confirmCustomization}
                        className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-3 font-medium text-white transition hover:bg-slate-800"
                      >
                        Add to order
                      </button>
                    </aside>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      ) : null}
    </PosPageShell>
  );
}
