import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getOrCreateUserDefaultOrgId } from "@/lib/org";

const createSchema = z.object({
  destination: z.string().url(),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, "Only letters, numbers, _ and -"),
    domainId: z.string().optional(),
  tags: z.array(z.string().min(1).max(30)).optional(),
  folder: z.string().min(1).max(50).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getOrCreateUserDefaultOrgId(userId);

  const links = await prisma.link.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      slug: true,
      destination: true,
      enabled: true,
      tags: true,
      folder: true,
      createdAt: true,
      _count: {
        select: {
          clickEvents: true, // ✅ REQUIRED FOR ANALYTICS
        },
      },
    },
  });

  return NextResponse.json({ links });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getOrCreateUserDefaultOrgId(userId);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { destination, slug, tags, folder,domainId } = parsed.data;

  try {
    const link = await prisma.link.create({
      data: {
        orgId,
        slug,
        destination,
        domainId: domainId ?? null,
        tags: tags ?? [],
        folder: folder ?? null,
      },
      select: {
        id: true,
        slug: true,
        destination: true,
        enabled: true,
        createdAt: true,
        _count: { select: { clickEvents: true } },
      },
    });

    return NextResponse.json({ ok: true, link });
  } catch {
    return NextResponse.json(
      { error: "Slug already exists" },
      { status: 409 }
    );
  }
}
