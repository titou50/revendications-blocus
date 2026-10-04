import { LiveDocument } from "@/components/live-document";
import { getEstablishment, listClaims } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function EstablishmentPage({
  params,
}: {
  params: Promise<{ establishmentId: string }>;
}) {
  const { establishmentId } = await params;
  const establishment = await getEstablishment(establishmentId);
  if (!establishment) notFound();

  const claims = await listClaims(establishment.id);

  return <LiveDocument establishment={establishment} initialClaims={claims} />;
}
