"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type AnalyticsResp = {
  ok: boolean;
  link: { id: string; slug: string; destination: string; enabled: boolean };
  total: number;
  days: number;
  series: { day: string; clicks: number }[];
};

export default function LinkAnalyticsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [data, setData] = useState<AnalyticsResp | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    (async () => {
      setErr(null);
      setData(null);

      const res = await fetch(
        `/api/analytics/link?id=${encodeURIComponent(id)}&days=30`,
        { credentials: "include" }
      );

      const text = await res.text();
      if (!res.ok) {
        setErr(`Failed (${res.status}): ${text}`);
        return;
      }

      setData(JSON.parse(text));
    })();
  }, [id]);

  const max = useMemo(() => {
    if (!data?.series?.length) return 0;
    return Math.max(...data.series.map((x) => x.clicks));
  }, [data]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <Link href="/app/links" className="text-sm underline">
          ← Back to Links
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Analytics</h1>
      </div>

      {err ? <div className="text-sm text-red-600">{err}</div> : null}
      {!data && !err ? <div className="text-sm text-gray-600">Loading…</div> : null}

      {data ? (
        <>
          <div className="rounded-xl border p-4 space-y-2">
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{data.link.slug}</span>
            </div>
            <div className="text-xs text-gray-600 break-all">{data.link.destination}</div>

            <div className="mt-3 flex items-center gap-4">
              <div className="rounded-xl border px-4 py-3">
                <div className="text-xs text-gray-600">Total (last {data.days} days)</div>
                <div className="text-2xl font-semibold tabular-nums">{data.total}</div>
              </div>

              <a
                className="rounded-xl border px-4 py-3 underline text-sm"
                href={`/api/analytics/link/csv?id=${encodeURIComponent(id)}&days=30`}
              >
                Download CSV
              </a>

              <a
                className="rounded-xl border px-4 py-3 underline text-sm"
                href={`/r/${data.link.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                Open →
              </a>
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <h2 className="font-medium">Daily clicks</h2>

            <div className="mt-4 space-y-2">
              {data.series.map((p) => {
                const w = max ? Math.round((p.clicks / max) * 100) : 0;
                return (
                  <div key={p.day} className="flex items-center gap-3">
                    <div className="w-24 text-xs text-gray-600 tabular-nums">{p.day}</div>
                    <div className="flex-1 h-3 rounded bg-gray-200 overflow-hidden">
                      <div className="h-3 bg-black" style={{ width: `${w}%` }} />
                    </div>
                    <div className="w-10 text-right text-xs tabular-nums">{p.clicks}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
