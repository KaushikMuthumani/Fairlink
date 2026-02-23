import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserDefaultOrgId } from "@/lib/org";

// 1. Update the type definition to wrap params in a Promise
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Await the params before using them
  const { id } = await params;

  const orgId = await getOrCreateUserDefaultOrgId(userId);
  if (!orgId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const link = await prisma.link.findFirst({
    where: { id: id, orgId }, // Use the awaited 'id' here
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