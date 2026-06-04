"use client";

import { useState } from "react";

export default function PortalLinkButton({ customerId }: { customerId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customerId }),
      });
      const data = await res.json();
      if (data.url) setUrl(data.url);
    } catch {
      alert("Failed to generate link");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (url) {
    return (
      <div className="flex items-center gap-2">
        <input type="text" readOnly value={url} className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-xs bg-gray-50 font-mono" />
        <button onClick={copy} className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800">
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={generate}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      <span className="material-symbols-outlined text-sm">link</span>
      {loading ? "..." : "Client Portal"}
    </button>
  );
}
