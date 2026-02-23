import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, ctx: { params?: { slug?: string } }) {
  // ✅ 1) Get slug from params, with fallback parsing from URL
  let slug = ctx?.params?.slug;

  if (!slug) {
    const pathname = new URL(req.url).pathname; // /r/can
    const parts = pathname.split("/").filter(Boolean); // ["r","can"]
    slug = parts[1];
  }

  slug = slug ? decodeURIComponent(slug) : "";
  if (!slug) return new NextResponse("Not found", { status: 404 });

  // ✅ 2) Hostname-based domain routing (strip port)
  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();

  const domain = host
    ? await prisma.domain.findUnique({
        where: { hostname: host },
        select: { id: true },
      })
    : null;

  // ✅ 3) Lookup link strictly by slug (never ignored)
  const link = await prisma.link.findFirst({
    where: domain
      ? { slug, domainId: domain.id, enabled: true }
      : { slug, domainId: null, enabled: true },
    select: { id: true, destination: true },
  });

  if (!link) return new NextResponse("Not found", { status: 404 });

  // ✅ 4) Record click async (does not block redirect)
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

  return NextResponse.redirect(link.destination, { status: 302 });
}
