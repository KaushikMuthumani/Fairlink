import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserDefaultOrgId } from "@/lib/org";

type AggRow = { date: Date; clicks: number };
type CsvRow = { day: string; clicks: number };

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | null)?.id;

  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const orgId = await getOrCreateUserDefaultOrgId(userId);
  if (!orgId) {
    return new Response(JSON.stringify({ error: "No workspace" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const linkId = url.searchParams.get("id");
  const days = Number(url.searchParams.get("days") ?? "30");

  if (!linkId) {
    return new Response(JSON.stringify({ error: "Missing id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!Number.isFinite(days) || days < 1 || days > 365) {
    return new Response(JSON.stringify({ error: "Invalid days" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Ensure link belongs to org
  const link = await prisma.link.findFirst({
    where: { id: linkId, orgId },
    select: { id: true },
  });

  if (!link) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const from = new Date();
  from.setUTCDate(from.getUTCDate() - (days - 1));
  from.setUTCHours(0, 0, 0, 0);

  const rawRows: AggRow[] = await prisma.clickAggDaily.findMany({
    where: { linkId, date: { gte: from } },
    orderBy: { date: "asc" },
    select: { date: true, clicks: true },
  });

  const rows: CsvRow[] = rawRows.map((x) => ({
    day: x.date.toISOString().slice(0, 10),
    clicks: x.clicks,
  }));

  const header = "day,clicks\n";
  const body = rows.map((r) => `${r.day},${r.clicks}`).join("\n");
  const csv = header + body + "\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="link-${linkId}-last-${days}-days.csv"`,
      "Cache-Control": "no-store",
    },
  });
}