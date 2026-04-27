"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import { isAdminRole, withBranchScope } from "@/lib/branch-scope";

type Menu = {
  id: number;
  name: string;
  price: number;
  image_url: string;
  category_name?: string;
};

type MenuRow = {
  id: number;
  name: string;
  price: number;
  image_url: string;
  category?: {
    name?: string;
  } | null;
};

export default function ShowMenuPage() {
  const router = useRouter();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [scopeUser, setScopeUser] = useState<{
    role?: string | null;
    branch_id?: string | null;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [deletingMenuId, setDeletingMenuId] = useState<number | null>(null);

  const fetchMenus = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      setErrorMessage(authError.message || "Failed to load session");
      setLoading(false);
      return;
    }

    if (!authData.user) {
      router.push("/login");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("branch_id, role")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      setErrorMessage(profileError?.message || "Profile not found");
      setLoading(false);
      return;
    }

    setScopeUser(profile);

    const menuQuery = supabase.from("menus").select(`
      *,
      category:categories(name)
    `);
    const { data, error } = await withBranchScope(menuQuery, profile).order("id", {
      ascending: false,
    });

    if (error) {
      setErrorMessage(error.message || "Failed to load menus");
      setLoading(false);
      return;
    }

    const mappedMenus = ((data as MenuRow[]) || []).map((item) => ({
      ...item,
      category_name: item.category?.name,
    }));

    setMenus(mappedMenus);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchMenus();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchMenus]);

  async function deleteMenu(id: number) {
    if (!scopeUser) return;
    if (!isAdminRole(scopeUser) && !scopeUser.branch_id) return;

    const confirmDelete = confirm("Delete this menu?");
    if (!confirmDelete) return;
    setDeletingMenuId(id);
    setActionMessage(null);
    setErrorMessage(null);

    const deleteQuery = supabase.from("menus").delete().eq("id", id);
    const { error } = await withBranchScope(deleteQuery, scopeUser);

    if (error) {
      setErrorMessage(error.message || "Failed to delete menu");
      setDeletingMenuId(null);
      return;
    }

    setMenus((current) => current.filter((menu) => menu.id !== id));
    setActionMessage("Menu deleted successfully");
    setDeletingMenuId(null);
  }

  if (loading) {
    return (
      <div className="px-6 py-8 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[32px] border border-slate-300 bg-white/88 p-8 text-slate-500 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          Loading menus...
        </div>
      </div>
    );
  }

  if (errorMessage && menus.length === 0) {
    return (
      <div className="px-6 py-8 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[32px] border border-red-200 bg-red-50 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          <p className="font-medium text-red-800">Failed to load menus</p>
          <p className="mt-2 text-sm text-red-700">{errorMessage}</p>
          <button
            onClick={() => void fetchMenus()}
            className="mt-4 rounded-xl bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
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

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredMenus = menus.filter((menu) => {
    const category = menu.category_name || "Uncategorized";
    const matchCategory =
      selectedCategory === "ALL" || category === selectedCategory;
    const matchSearch =
      normalizedSearch.length === 0 ||
      menu.name.toLowerCase().includes(normalizedSearch) ||
      category.toLowerCase().includes(normalizedSearch);

    return matchCategory && matchSearch;
  });

  const groupedMenus = filteredMenus.reduce<Record<string, Menu[]>>(
    (acc, menu) => {
      const category = menu.category_name || "Uncategorized";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(menu);
      return acc;
    },
    {}
  );

  const groupedEntries = Object.entries(groupedMenus).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  return (
    <div className="px-6 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[32px] border border-slate-300 bg-white/88 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Menu system
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
                Menu List
              </h1>
              <p className="max-w-2xl text-slate-600">
                Review, edit, and maintain your cafe catalog from one clean menu
                workspace.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                {menus.length} menu items
              </div>
              <button
                onClick={() => router.push("/menu-system/add-menu")}
                className="rounded-2xl bg-slate-950 px-5 py-3 font-medium text-white transition hover:bg-slate-800"
              >
                + Add Menu
              </button>
            </div>
          </div>
        </section>

        {actionMessage ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {actionMessage}
          </section>
        ) : null}

        {errorMessage ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="font-medium text-red-800">Action failed</p>
            <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
          </section>
        ) : null}

        <section className="rounded-[32px] border border-slate-300 bg-white/88 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by menu name or category"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white"
              />
              <p className="text-sm text-slate-500">
                {filteredMenus.length} results
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((category) => {
                const isActive = category === selectedCategory;
                const label = category === "ALL" ? "All categories" : category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={[
                      "rounded-full border px-4 py-2 text-sm font-medium transition",
                      isActive
                        ? "border-slate-900 bg-slate-950 text-white"
                        : "border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-900 hover:bg-white",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {menus.length === 0 ? (
          <section className="rounded-[32px] border border-dashed border-slate-300 bg-white/70 p-10 text-center shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
              Empty state
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              No menu items yet
            </h2>
            <p className="mt-3 text-slate-500">
              Add your first menu item to start building the branch catalog.
            </p>
            <button
              onClick={() => router.push("/menu-system/add-menu")}
              className="mt-6 rounded-2xl bg-slate-950 px-5 py-3 font-medium text-white transition hover:bg-slate-800"
            >
              Create first menu
            </button>
          </section>
        ) : filteredMenus.length === 0 ? (
          <section className="rounded-[32px] border border-dashed border-slate-300 bg-white/70 p-10 text-center shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
              No results
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              No menu matched this filter
            </h2>
            <p className="mt-3 text-slate-500">
              Try another keyword or switch the category.
            </p>
          </section>
        ) : (
          <div className="space-y-8">
            {groupedEntries.map(([category, categoryMenus]) => (
              <section key={category} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                    {category}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {categoryMenus.length} items
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {categoryMenus.map((menu) => (
                    <article
                      key={menu.id}
                      className="overflow-hidden rounded-[28px] border border-slate-300 bg-white/92 shadow-[0_22px_50px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_65px_rgba(15,23,42,0.1)]"
                    >
                      {menu.image_url ? (
                        <div className="relative h-52 w-full">
                          <Image
                            src={menu.image_url}
                            alt={menu.name}
                            fill
                            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-52 items-center justify-center bg-[linear-gradient(135deg,#e5e7eb_0%,#f8fafc_100%)] text-sm font-medium text-slate-400">
                          No image
                        </div>
                      )}

                      <div className="space-y-4 p-6">
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                          {menu.name}
                        </h2>

                        <div className="flex items-center justify-between">
                          <p className="text-lg font-semibold text-slate-900">
                            {menu.price} THB
                          </p>
                          <div className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {menu.category_name || "Uncategorized"}
                          </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={() =>
                              router.push(`/menu-system/edit/${menu.id}`)
                            }
                            className="flex-1 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 font-medium text-slate-900 transition hover:border-slate-900 hover:bg-white"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deleteMenu(menu.id)}
                            disabled={deletingMenuId === menu.id}
                            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 font-medium text-red-600 transition hover:border-red-300 hover:bg-red-100"
                          >
                            {deletingMenuId === menu.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
