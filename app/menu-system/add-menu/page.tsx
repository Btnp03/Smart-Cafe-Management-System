"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import {
  getInheritedBranchIds,
  isAdminRole,
  MAIN_BRANCH_NAME,
} from "@/lib/branch-scope";

type Category = {
  id: string;
  name: string;
  branch_id: string;
};

type Branch = {
  id: string;
  branch_name: string;
};

export default function AddService() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageStatus, setPageStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [pageError, setPageError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formMessageType, setFormMessageType] = useState<"success" | "error" | null>(
    null
  );
  const [branchId, setBranchId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [mainBranchId, setMainBranchId] = useState<string | null>(null);

  const loadCategoriesForBranches = useCallback(async (targetBranchId: string) => {
    const accessibleBranchIds = getInheritedBranchIds(targetBranchId, mainBranchId);

    let categoryQuery = supabase.from("categories").select("*");

    if (accessibleBranchIds.length === 0) {
      setCategories([]);
      setCategoryId("");
      return;
    }

    if (accessibleBranchIds.length === 1) {
      categoryQuery = categoryQuery.eq("branch_id", accessibleBranchIds[0]);
    } else {
      categoryQuery = categoryQuery.in("branch_id", accessibleBranchIds);
    }

    const { data, error } = await categoryQuery.order("name", { ascending: true });

    if (error) {
      throw error;
    }

    setCategories((data as Category[]) || []);
    setCategoryId("");
  }, [mainBranchId]);

  const getProfile = useCallback(async () => {
    setPageStatus("loading");
    setPageError(null);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      setPageStatus("error");
      setPageError(authError.message || "Failed to load session");
      return;
    }

    if (!authData.user) {
      router.push("/login");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      setPageStatus("error");
      setPageError(profileError?.message || "Profile not found");
      return;
    }

    const adminMode = isAdminRole(profile);
    setIsAdmin(adminMode);

    if (!adminMode && !profile?.branch_id) {
      router.push("/select-branch");
      return;
    }

    if (adminMode) {
      const { data: branchData, error: branchError } = await supabase
        .from("branch")
        .select("id, branch_name")
        .order("branch_name", { ascending: true });

      if (branchError) {
        setPageStatus("error");
        setPageError(branchError.message || "Failed to load branches");
        return;
      }

      setBranches((branchData as Branch[]) || []);
      setBranchId(null);
      setSelectedBranchId("");
      setCategories([]);
      setCategoryId("");
      setPageStatus("success");
      return;
    }

    setBranchId(profile.branch_id || null);
    setSelectedBranchId(profile.branch_id || "");
    if (profile.branch_id) {
      try {
        await loadCategoriesForBranches(profile.branch_id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load categories";
        setPageStatus("error");
        setPageError(message);
        return;
      }
    }
    setPageStatus("success");
  }, [loadCategoriesForBranches, router]);

  useEffect(() => {
    let isMounted = true;

    async function loadMainBranch() {
      const { data } = await supabase
        .from("branch")
        .select("id")
        .eq("branch_name", MAIN_BRANCH_NAME)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      setMainBranchId(data?.id ?? null);
    }

    void loadMainBranch();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isAdmin || !selectedBranchId) {
      return;
    }

    let isMounted = true;

    async function loadCategoriesForBranch() {
      try {
        await loadCategoriesForBranches(selectedBranchId);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Failed to load categories";
        setFormMessageType("error");
        setFormMessage(message);
        setCategories([]);
      }
    }

    void loadCategoriesForBranch();

    return () => {
      isMounted = false;
    };
  }, [isAdmin, loadCategoriesForBranches, selectedBranchId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void getProfile();
    }, 0);

    return () => clearTimeout(timer);
  }, [getProfile]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormMessage(null);
    setFormMessageType(null);
    setLoading(true);

    let imageUrl = "";

    if (image) {
      const fileName = `${Date.now()}-${image.name}`;

      const { error: uploadError } = await supabase.storage
        .from("picture of menu")
        .upload(fileName, image);

      if (uploadError) {
        setFormMessageType("error");
        setFormMessage(uploadError.message);
        setLoading(false);
        return;
      }

      const { data } = supabase.storage
        .from("picture of menu")
        .getPublicUrl(fileName);

      imageUrl = data.publicUrl;
    }

    let insertError: string | null = null;
    const targetBranchId = isAdmin ? selectedBranchId : branchId;

    if (!targetBranchId) {
      setFormMessageType("error");
      setFormMessage("Please select a target branch.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("menus").insert([
      {
        name,
        price: Number(price),
        image_url: imageUrl,
        branch_id: targetBranchId,
        category_id: categoryId,
      },
    ]);
    insertError = error?.message || null;

    if (insertError) {
      setFormMessageType("error");
      setFormMessage(insertError);
      setLoading(false);
      return;
    }

    setFormMessageType("success");
    setFormMessage("Add menu success");
    router.push("/menu-system/show-menu");
    router.refresh();
  }

  return (
    <div className="px-6 py-8 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <section className="rounded-[32px] border border-slate-300 bg-white/88 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Menu system
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
              Add Cafe Menu
            </h1>
            <p className="max-w-2xl text-slate-600">
              Create a new menu item for the active branch and keep your catalog
              consistent with the rest of the workspace.
            </p>
          </div>
        </section>

        {pageStatus === "error" ? (
          <section className="rounded-[32px] border border-red-200 bg-red-50 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
            <p className="font-medium text-red-800">Failed to load form data</p>
            <p className="mt-1 text-sm text-red-700">{pageError}</p>
            <button
              onClick={() => void getProfile()}
              className="mt-3 rounded-xl bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              Retry
            </button>
          </section>
        ) : null}

        {pageStatus === "loading" || (!isAdmin && !branchId) ? (
          <section className="rounded-[32px] border border-slate-300 bg-white/88 p-8 text-slate-500 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
            Loading branch...
          </section>
        ) : (
          <section className="rounded-[32px] border border-slate-300 bg-white/92 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
            <form onSubmit={handleSubmit} className="space-y-5">
              {formMessage ? (
                <div
                  className={[
                    "rounded-xl border px-4 py-3 text-sm",
                    formMessageType === "success"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-red-300 bg-red-50 text-red-800",
                  ].join(" ")}
                >
                  {formMessage}
                </div>
              ) : null}

              <div className="grid gap-5">
                {isAdmin ? (
                  <select
                    required
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white"
                    value={selectedBranchId}
                    onChange={(e) => {
                      setSelectedBranchId(e.target.value);
                      setFormMessage(null);
                      setFormMessageType(null);
                    }}
                  >
                    <option value="">Select target branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.branch_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 text-slate-600">
                    Active branch: {categories[0]?.branch_id || branchId}
                  </div>
                )}

                <input
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white"
                  placeholder="Menu name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <input
                  required
                  type="number"
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white"
                  placeholder="Price (THB)"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />

                <select
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={isAdmin && !selectedBranchId}
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                      {selectedBranchId &&
                      mainBranchId &&
                      cat.branch_id === mainBranchId &&
                      selectedBranchId !== mainBranchId
                        ? " (Main branch)"
                        : ""}
                    </option>
                  ))}
                </select>

                <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-5">
                  <p className="text-sm font-medium text-slate-700">
                    Upload menu image
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Add a cover image to make the menu card look complete.
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImage(e.target.files?.[0] || null)}
                    className="mt-4 block w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:font-medium file:text-white hover:file:bg-slate-800"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button
                  disabled={loading}
                  className="flex-1 rounded-2xl bg-slate-950 px-6 py-4 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {loading ? "Adding menu..." : "Add Menu"}
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/menu-system/show-menu")}
                  className="flex-1 rounded-2xl border border-slate-300 bg-slate-50 px-6 py-4 font-medium text-slate-900 transition hover:border-slate-900 hover:bg-white"
                >
                  Back to Menu List
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
