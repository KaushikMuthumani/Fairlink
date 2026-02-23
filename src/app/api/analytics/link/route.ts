import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserDefaultOrgId } from "@/lib/org";

type AggRow = { date: Date; clicks: number };
type DayRow = { day: string; clicks: number };

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | null)?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getOrCreateUserDefaultOrgId(userId);
  if (!orgId) {
    return NextResponse.json({ error: "No workspace" }, { status: 400 });
  }

  const url = new URL(req.url);
  const linkId = url.searchParams.get("id");
  const days = Number(url.searchParams.get("days") ?? "30");

  if (!linkId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  if (!Number.isFinite(days) || days < 1 || days > 365) {
    return NextResponse.json({ error: "Invalid days" }, { status: 400 });
  }

  const link = await prisma.link.findFirst({
    where: { id: linkId, orgId },
    select: { id: true, slug: true, destination: true, enabled: true },
  });

  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const from = new Date();
  from.setUTCDate(from.getUTCDate() - (days - 1));
  from.setUTCHours(0, 0, 0, 0);

  const raw: AggRow[] = await prisma.clickAggDaily.findMany({
    where: { linkId, date: { gte: from } },
    orderBy: { date: "asc" },
    select: { date: true, clicks: true },
  });

  const rows: DayRow[] = raw.map((x) => ({
    day: x.date.toISOString().slice(0, 10),
    clicks: x.clicks,
  }));

  const map: Map<string, number> = new Map(
    rows.map((r: DayRow) => [r.day, r.clicks])
  );

  const series: DayRow[] = [];
  let total = 0;

  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setUTCDate(from.getUTCDate() + i);
    const day = d.toISOString().slice(0, 10);

    const clicks = map.get(day) ?? 0;
    total += clicks;
    series.push({ day, clicks });
  }

  return NextResponse.json({ ok: true, link, total, days, series });
}