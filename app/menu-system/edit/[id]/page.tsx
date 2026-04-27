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
    return <div className="p-10">Loading...</div>;
  }

  if (pageStatus === "error") {
    return (
      <div className="p-10 max-w-xl mx-auto">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
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
    <div className="p-10 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Edit Menu</h1>

      <form onSubmit={handleUpdate} className="space-y-4">
        {formStatus ? (
          <div
            className={[
              "rounded-xl border px-4 py-3 text-sm",
              formStatusType === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-red-300 bg-red-50 text-red-800",
            ].join(" ")}
          >
            {formStatus}
          </div>
        ) : null}

        <input
          required
          className="border p-3 w-full rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          required
          type="number"
          className="border p-3 w-full rounded"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        {imageUrl && (
          <div className="relative h-40 w-full overflow-hidden rounded">
            <SmartImage
              src={imageUrl}
              alt={name || "Menu image"}
              fill
              sizes="(min-width: 640px) 576px, 100vw"
              className="object-cover"
            />
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setNewImage(e.target.files?.[0] || null)}
        />

        <button
          disabled={isSaving}
          className="bg-blue-500 text-white px-6 py-3 rounded w-full disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
