import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getOrCreateUserDefaultOrgId } from "@/lib/org";

const schema = z.object({
  hostname: z.string().min(3),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrCreateUserDefaultOrgId(userId);

  const domains = await prisma.domain.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ domains });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrCreateUserDefaultOrgId(userId);

  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success)
    return NextResponse.json({ error: "Invalid hostname" }, { status: 400 });

  try {
    const domain = await prisma.domain.create({
      data: {
        orgId,
        hostname: parsed.data.hostname.toLowerCase(),
        verified: false,
      },
    });

    return NextResponse.json({ ok: true, domain });
  } catch {
    return NextResponse.json(
      { error: "Domain already exists" },
      { status: 409 }
    );
  }
}
