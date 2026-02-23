import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserDefaultOrgId } from "@/lib/org";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const orgId = await getOrCreateUserDefaultOrgId(userId);
  if (!orgId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const link = await prisma.link.findFirst({
    where: { id, orgId },
    select: { id: true, enabled: true },
  });

  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.link.update({
    where: { id: link.id },
    data: { enabled: !link.enabled },
    select: { id: true, enabled: true },
  });

  return NextResponse.json({ ok: true, link: updated });
}