import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  // simple shared-secret protection
  const auth = req.headers.get("authorization");
  if (!process.env.RETENTION_SECRET || auth !== `Bearer ${process.env.RETENTION_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const days = Math.min(Math.max(Number(url.searchParams.get("days") ?? "30"), 7), 365);

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);

  const result = await prisma.clickEvent.deleteMany({
    where: { ts: { lt: cutoff } },
  });

  return NextResponse.json({ ok: true, deleted: result.count, days });
}
