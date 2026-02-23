import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserDefaultOrgId } from "@/lib/org";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrCreateUserDefaultOrgId(userId);
  if (!orgId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const url = new URL(req.url);
  const linkId = url.searchParams.get("id");
  const days = Number(url.searchParams.get("days") ?? "30");

  if (!linkId) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!Number.isFinite(days) || days < 1 || days > 365)
    return NextResponse.json({ error: "Invalid days" }, { status: 400 });

  // Ensure link belongs to org
  const link = await prisma.link.findFirst({
    where: { id: linkId, orgId },
    select: { id: true },
  });
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const from = new Date();
  from.setUTCDate(from.getUTCDate() - (days - 1));
  from.setUTCHours(0, 0, 0, 0);

  const rows: Array<{ day: string; clicks: number }> = await prisma.clickAggDaily
    .findMany({
      where: { linkId, date: { gte: from } },
      orderBy: { date: "asc" },
      select: { date: true, clicks: true },
    })
    .then((rs) =>
      rs.map((x) => ({
        day: x.date.toISOString().slice(0, 10),
        clicks: x.clicks,
      }))
    );

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