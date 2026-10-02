import { NextRequest } from "next/server";
import { getEstablishment, listClaims } from "@/lib/db";
import { buildOdt } from "@/lib/export-document";
import { buildPlainText } from "@/lib/plain-text";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ establishmentId: string }> }
) {
  const { establishmentId } = await ctx.params;
  const format = req.nextUrl.searchParams.get("format") ?? "txt";
  const establishment = await getEstablishment(establishmentId);
  if (!establishment) {
    return new Response("Établissement introuvable", { status: 404 });
  }
  const claims = await listClaims(establishmentId);
  const slug = establishment.name.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase();

  if (format === "odt") {
    const buffer = await buildOdt(establishment, claims);
    return new Response(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/vnd.oasis.opendocument.text",
        "Content-Disposition": `attachment; filename="${slug}.odt"`,
      },
    });
  }

  const text = buildPlainText(establishment, claims);
  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.txt"`,
    },
  });
}
