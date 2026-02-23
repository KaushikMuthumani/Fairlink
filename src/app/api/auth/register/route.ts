import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(50).optional(),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function makeUniqueOrgSlug(base: string) {
  let slug = base || "workspace";
  for (let i = 0; i < 8; i++) {
    const exists = await prisma.organization.findUnique({ where: { slug } });
    if (!exists) return slug;
    slug = `${base}-${Math.floor(Math.random() * 9000 + 1000)}`;
  }
  return `${base}-${Date.now()}`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const baseSlug = slugify(email.split("@")[0] || "workspace");
  const orgSlug = await makeUniqueOrgSlug(baseSlug);
  const orgName = name?.trim() ? `${name.trim()}'s Workspace` : "My Workspace";

  // ✅ Create user + org + membership atomically
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: name ?? null, email, passwordHash },
      select: { id: true, email: true, name: true },
    });

    const org = await tx.organization.create({
      data: { name: orgName, slug: orgSlug },
      select: { id: true, slug: true, name: true },
    });

    await tx.membership.create({
      data: { userId: user.id, orgId: org.id, role: "OWNER" },
    });

    return { user, org };
  });

  return NextResponse.json({ ok: true, ...result });
}
