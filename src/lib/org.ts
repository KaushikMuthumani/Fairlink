import { prisma } from "@/lib/prisma";

export async function getOrCreateUserDefaultOrgId(userId: string) {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    orderBy: { id: "asc" },
    select: { orgId: true },
  });

  if (membership?.orgId) return membership.orgId;

  // Safety net: create workspace if missing
  const org = await prisma.organization.create({
    data: {
      name: "My Workspace",
      slug: `workspace-${userId.slice(-6)}-${Math.floor(Math.random() * 9000 + 1000)}`,
    },
    select: { id: true },
  });

  await prisma.membership.create({
    data: { userId, orgId: org.id, role: "OWNER" },
  });

  return org.id;
}
