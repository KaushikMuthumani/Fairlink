import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserDefaultOrgId } from "@/lib/org";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const orgId = await getOrCreateUserDefaultOrgId(userId);

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const days = Math.min(Math.max(Number(url.searchParams.get("days") ?? "30"), 7), 90);
  if (!id) return new Response("Missing id", { status: 400 });

  const link = await prisma.link.findFirst({
    where: { id, orgId },
    select: { id: true, slug: true },
  });
  if (!link) return new Response("Not found", { status: 404 });

  const start = new Date();
  start.setUTCDate(start.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);

  const rows = await prisma.$queryRaw<{ day: string; clicks: number }[]>`
    SELECT
      (date_trunc('day', "ts" AT TIME ZONE 'UTC'))::date::text AS day,
      COUNT(*)::int AS clicks
    FROM "ClickEvent"
    WHERE "linkId" = ${link.id}
      AND "ts" >= ${start}
    GROUP BY day
    ORDER BY day ASC
  `;

  const header = "day,clicks\n";
  const body = rows.map((r) => `${r.day},${r.clicks}`).join("\n");
  const csv = header + body + "\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${link.slug}-last-${days}-days.csv"`,
    },
  });
}
