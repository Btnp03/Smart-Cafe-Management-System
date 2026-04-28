"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { isAdminRole, withBranchScope } from "@/lib/branch-scope";
import SmartImage from "@/app/_components/smart-image";

export default function EditMenuPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [newImage, setNewImage] = useState<File | null>(null);
  const [pageStatus, setPageStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [pageError, setPageError] = useState<string | null>(null);
  const [formStatus, setFormStatus] = useState<string | null>(null);
  const [formStatusType, setFormStatusType] = useState<"success" | "error" | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);

  const fetchMenu = useCallback(async () => {
    if (!isAdminRole(user) && !user?.branch_id) return;

    setPageStatus("loading");
    setPageError(null);

    const menuQuery = supabase.from("menus").select("*").eq("id", id);
    const { data, error } = await withBranchScope(menuQuery, user).single();

    if (error || !data) {
      setPageStatus("error");
      setPageError(error?.message || "Menu not found");
      return;
    }

    setName(data.name);
    setPrice(String(data.price));
    setImageUrl(data.image_url);
    setPageStatus("success");
  }, [id, user]);

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
      void fetchMenu();
    }, 0);

    return () => clearTimeout(timer);
  }, [id, router, authLoading, user, fetchMenu]);

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    setFormStatus(null);
    setFormStatusType(null);

    if (!isAdminRole(user) && !user?.branch_id) {
      setFormStatusType("error");
      setFormStatus("Branch is not selected");
      setIsSaving(false);
      return;
    }

    let updatedImageUrl = imageUrl;

    if (newImage) {
      const fileName = Date.now() + "-" + newImage.name;

      const { error: uploadError } = await supabase.storage
        .from("picture of menu")
        .upload(fileName, newImage);

      if (uploadError) {
        setFormStatusType("error");
        setFormStatus(uploadError.message);
        setIsSaving(false);
        return;
      }

      const { data } = supabase.storage
        .from("picture of menu")
        .getPublicUrl(fileName);

      updatedImageUrl = data.publicUrl;
    }

    const updateQuery = supabase
      .from("menus")
      .update({
        name,
        price: Number(price),
        image_url: updatedImageUrl,
      })
      .eq("id", id);
    const { error } = await withBranchScope(updateQuery, user);

    if (error) {
      setFormStatusType("error");
      setFormStatus(error.message);
      setIsSaving(false);
      return;
    }

    setFormStatusType("success");
    setFormStatus("Updated successfully");
    setIsSaving(false);
    router.push("/menu-system/show-menu");
  }

  if (pageStatus === "loading" || authLoading) {
    return (
      <div className="px-6 py-8 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-[32px] border border-slate-300 bg-white/88 p-8 text-slate-500 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          Loading menu...
        </div>
      </div>
    );
  }

  if (pageStatus === "error") {
    return (
      <div className="px-6 py-8 lg:px-8">
        <div className="mx-auto max-w-2xl rounded-[32px] border border-red-200 bg-red-50 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          <p className="font-medium text-red-800">Failed to load menu</p>
          <p className="mt-1 text-sm text-red-700">{pageError}</p>
          <button
            onClick={() => void fetchMenu()}
            className="mt-3 rounded-xl bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="rounded-[32px] border border-slate-300 bg-white/88 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Menu system
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
                Edit menu item
              </h1>
              <p className="max-w-2xl text-slate-600">
                Update the menu name, pricing, and preview image so the branch
                catalog stays clean and accurate.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/menu-system/show-menu")}
              className="rounded-2xl border border-slate-300 bg-slate-50 px-5 py-3 font-medium text-slate-900 transition hover:border-slate-900 hover:bg-white"
            >
              Back to menu list
            </button>
          </div>
        </section>

        <form
          onSubmit={handleUpdate}
          className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_360px]"
        >
          <section className="rounded-[32px] border border-slate-300 bg-white/92 p-8 shadow-[0_22px_50px_rgba(15,23,42,0.06)]">
            <div className="space-y-6">
              {formStatus ? (
                <div
                  className={[
                    "rounded-2xl border px-4 py-3 text-sm",
                    formStatusType === "success"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-red-300 bg-red-50 text-red-800",
                  ].join(" ")}
                >
                  {formStatus}
                </div>
              ) : null}

              <div className="space-y-2">
                <label
                  htmlFor="menu-name"
                  className="text-sm font-semibold text-slate-700"
                >
                  Menu name
                </label>
                <input
                  id="menu-name"
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-900 focus:bg-white"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Almond Croissant"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="menu-price"
                  className="text-sm font-semibold text-slate-700"
                >
                  Price (THB)
                </label>
                <input
                  id="menu-price"
                  required
                  type="number"
                  min="0"
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-900 focus:bg-white"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="75"
                />
              </div>

              <div className="space-y-3">
                <label
                  htmlFor="menu-image"
                  className="text-sm font-semibold text-slate-700"
                >
                  Replace image
                </label>
                <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-5">
                  <input
                    id="menu-image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewImage(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:font-medium file:text-white hover:file:bg-slate-800"
                  />
                  <p className="mt-3 text-sm text-slate-500">
                    Upload a fresh image to replace the current preview.
                  </p>
                </div>
              </div>

              <button
                disabled={isSaving}
                className="w-full rounded-2xl bg-slate-950 px-6 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
              >
                {isSaving ? "Saving changes..." : "Save changes"}
              </button>
            </div>
          </section>

          <aside className="rounded-[32px] border border-slate-300 bg-white/92 p-6 shadow-[0_22px_50px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Live preview
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              {name || "Untitled menu"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              THB {price || "0"}
            </p>

            <div className="mt-6 overflow-hidden rounded-[28px] border border-slate-300 bg-slate-50">
              <div className="relative h-64 w-full">
                <SmartImage
                  src={imageUrl}
                  alt={name || "Menu image"}
                  fill
                  sizes="(min-width: 1280px) 360px, 100vw"
                  className="object-cover"
                />
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              {newImage
                ? `Selected file: ${newImage.name}`
                : "No new image selected. The current image will stay in place."}
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}
