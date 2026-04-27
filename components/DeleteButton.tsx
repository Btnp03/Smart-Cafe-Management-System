"use client";

import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    const confirmDelete = confirm("Delete this menu?");
    if (!confirmDelete) return;
    setIsDeleting(true);
    setErrorMessage(null);

    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      setIsDeleting(false);
      return;
    }

    setIsDeleting(false);
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="bg-red-500 text-white px-3 py-1 rounded disabled:cursor-not-allowed disabled:bg-red-300"
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </button>
      {errorMessage ? (
        <p className="text-xs text-red-600">{errorMessage}</p>
      ) : null}
    </div>
  );
}
