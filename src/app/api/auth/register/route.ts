import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import type { PrismaClient } from "@prisma/client";

type TxClient = Parameters<PrismaClient["$transaction"]>[0] extends (
  tx: infer T,
  ...args: any[]
) => any
  ? T
  : never;

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function randomSuffix(len = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    name?: string;
    email?: string;
    password?: string;
  };

  const name = body.name?.trim() || null;
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password required" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ error: "User already exists" }, { status: 400 });
  }

  const passwordHash = await hash(password, 10);

  const result = await prisma.$transaction(async (tx: TxClient) => {
    const user = await tx.user.create({
      data: { name, email, passwordHash },
      select: { id: true, email: true, name: true },
    });

    const baseSlug = slugify((email.split("@")[0] || "workspace").slice(0, 30));
    const orgSlug = `${baseSlug}-${randomSuffix(6)}`;

    // NOTE: Your Prisma delegate is `organization` (per earlier error)
    const org = await tx.organization.create({
      data: {
        name: `${email}'s Workspace`,
        slug: orgSlug,
      },
      select: { id: true, slug: true },
    });

    await tx.membership.create({
      data: {
        userId: user.id,
        orgId: org.id,
        role: "OWNER",
      },
      select: { id: true },
    });

    return { user, org };
  });

  return NextResponse.json({
    ok: true,
    user: result.user,
    org: result.org,
  });
}
