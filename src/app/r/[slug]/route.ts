import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await context.params;

  let slug = rawSlug || "";
  if (!slug) {
    const pathname = new URL(req.url).pathname;
    const parts = pathname.split("/").filter(Boolean);
    slug = parts[1] ?? "";
  }

  slug = decodeURIComponent(slug);
  if (!slug) return new NextResponse("Not found", { status: 404 });

  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();

  const domain = host
    ? await prisma.domain.findUnique({
        where: { hostname: host },
        select: { id: true },
      })
    : null;

  const link = await prisma.link.findFirst({
    where: domain
      ? { slug, domainId: domain.id, enabled: true }
      : { slug, domainId: null, enabled: true },
    select: { id: true, destination: true },
  });

  if (!link) return new NextResponse("Not found", { status: 404 });

  prisma.clickEvent
    .create({
      data: {
        linkId: link.id,
        referrer: req.headers.get("referer"),
        device: req.headers.get("user-agent")?.slice(0, 200) ?? null,
      },
      select: { id: true },
    })
    .catch(() => {});
//correct
  return NextResponse.redirect(link.destination, { status: 302 });
}