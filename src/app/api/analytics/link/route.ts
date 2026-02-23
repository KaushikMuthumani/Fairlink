import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserDefaultOrgId } from "@/lib/org";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrCreateUserDefaultOrgId(userId);

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const days = Math.min(Math.max(Number(url.searchParams.get("days") ?? "30"), 7), 90);

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Make sure link belongs to this org
  const link = await prisma.link.findFirst({
    where: { id, orgId },
    select: { id: true, slug: true, destination: true, enabled: true },
  });

  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const start = new Date();
  start.setUTCDate(start.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);

  // Aggregate per day in Postgres (fast)
  const rows = await prisma.$queryRaw<
    { day: string; clicks: number }[]
  >`
    SELECT
      (date_trunc('day', "ts" AT TIME ZONE 'UTC'))::date::text AS day,
      COUNT(*)::int AS clicks
    FROM "ClickEvent"
    WHERE "linkId" = ${link.id}
      AND "ts" >= ${start}
    GROUP BY day
    ORDER BY day ASC
  `;

  const map = new Map(rows.map((r) => [r.day, r.clicks]));

  const series: { day: string; clicks: number }[] = [];
  let total = 0;

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const key = toISODate(d);
    const clicks = map.get(key) ?? 0;
    total += clicks;
    series.push({ day: key, clicks });
  }

  return NextResponse.json({ ok: true, link, total, days, series });
}
