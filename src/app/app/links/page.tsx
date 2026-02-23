"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type LinkRow = {
  id: string;
  slug: string;
  destination: string;
  enabled: boolean;
  tags: string[];
  folder: string | null;
  createdAt: string;
  _count: { clickEvents: number };
};

export default function LinksPage() {
  const router = useRouter();

  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dest, setDest] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/links", { credentials: "include" });
    const data = await res.json();
    setLinks(data.links ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return links;
    return links.filter(
      (l) =>
        l.slug.toLowerCase().includes(q) ||
        l.destination.toLowerCase().includes(q) ||
        (l.folder ?? "").toLowerCase().includes(q) ||
        l.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [links, search]);

  async function toggle(id: string) {
    setError(null);
    setBusyId(id);

    // optimistic update
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l))
    );

    const res = await fetch("/api/links/toggle", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) {
      // revert on failure
      setLinks((prev) =>
        prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l))
      );
      const text = await res.text();
      setError(`Toggle failed (${res.status}): ${text}`);
    }

    setBusyId(null);
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Links</h1>

      <div className="rounded-xl border p-4">
        <h2 className="font-medium">Create link</h2>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            className="rounded border px-3 py-2 md:col-span-2"
            placeholder="Destination URL"
            value={dest}
            onChange={(e) => setDest(e.target.value)}
          />
          <input
            className="rounded border px-3 py-2"
            placeholder="Slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <button
          className="mt-3 rounded bg-black text-white px-4 py-2"
          onClick={async () => {
            setError(null);
            const res = await fetch("/api/links", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ destination: dest, slug }),
            });

            if (!res.ok) {
              const d = await res.json().catch(() => ({}));
              setError(d.error ?? "Failed");
              return;
            }

            setDest("");
            setSlug("");
            await load();
          }}
        >
          Create
        </button>
      </div>

      <input
        className="rounded border px-3 py-2 max-w-md"
        placeholder="Search…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="rounded-xl border overflow-hidden">
        <div className="grid grid-cols-12 bg-gray-100 px-4 py-2 text-xs font-medium">
          <div className="col-span-3">Slug</div>
          <div className="col-span-6">Destination</div>
          <div className="col-span-1">Clicks</div>
          <div className="col-span-2">Status</div>
        </div>

        {loading ? (
          <div className="p-4 text-sm text-gray-600">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">No links yet.</div>
        ) : (
          filtered.map((l) => (
            <div
              key={`${l.id}:${l.slug}`} // ✅ stronger key to prevent DOM reuse bugs
              className="grid grid-cols-12 px-4 py-3 border-t items-center text-sm"
            >
              <div className="col-span-3 font-medium">
                {/* Analytics is PRIMARY: use router.push for 100% correct navigation */}
                <button
                  type="button"
                  className="underline text-left block"
                  onClick={() => router.push(`/app/links/${l.id}`)}
                  title={`Open analytics for id=${l.id}`}
                >
                  {l.slug}
                </button>

                <div className="text-xs text-gray-600 mt-1 flex gap-3">
                  <a
                    href={`/r/${l.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Open →
                  </a>

                  {/* Debug helper: shows ID so you can confirm each row differs */}
                  <span className="text-gray-400 select-text">
                    {l.id.slice(0, 6)}
                  </span>
                </div>
              </div>

              <div className="col-span-6 truncate">{l.destination}</div>

              <div className="col-span-1 tabular-nums">{l._count.clickEvents}</div>

              <div className="col-span-2">
                <button
                  disabled={busyId === l.id}
                  onClick={() => toggle(l.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    l.enabled ? "bg-green-600 text-white" : "bg-red-600 text-white"
                  } ${busyId === l.id ? "opacity-60" : ""}`}
                >
                  {l.enabled ? "Enabled" : "Disabled"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
