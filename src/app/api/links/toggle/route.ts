import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserDefaultOrgId } from "@/lib/org";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getOrCreateUserDefaultOrgId(userId);

  const body = await req.json().catch(() => null);
  const id = body?.id as string | undefined;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const link = await prisma.link.findFirst({
    where: { id, orgId },
    select: { id: true, enabled: true },
  });

  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.link.update({
    where: { id: link.id },
    data: { enabled: !link.enabled },
    select: { id: true, enabled: true },
  });

  return NextResponse.json({ ok: true, link: updated });
}
