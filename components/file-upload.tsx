"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  bucket: string;
  folder: string;
  onUpload: (url: string) => void;
  accept?: string;
  label?: string;
};

export default function FileUpload({ bucket, folder, onUpload, accept = "image/*", label = "Upload" }: Props) {
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${folder}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (error) throw error;

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onUpload(data.publicUrl);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <label className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
      <span className="material-symbols-outlined text-lg">{uploading ? "hourglass_empty" : "upload"}</span>
      {uploading ? "Uploading..." : label}
      <input type="file" accept={accept} onChange={handleUpload} disabled={uploading} className="hidden" />
    </label>
  );
}
