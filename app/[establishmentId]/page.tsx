import { LiveDocument } from "@/components/live-document";
import { getEstablishment, listClaims, recordVisit } from "@/lib/db";
import { getSessionId, hashSession } from "@/lib/session";
import { notFound } from "next/navigation";

export default async function EstablishmentPage({
  params,
}: {
  params: Promise<{ establishmentId: string }>;
}) {
  const { establishmentId } = await params;
  const establishment = await getEstablishment(establishmentId);
  if (!establishment) notFound();

  const session = hashSession(await getSessionId());
  const participant_count = await recordVisit(establishment.id, session);
  const claims = await listClaims(establishment.id);

  return (
    <LiveDocument
      establishment={{ ...establishment, participant_count }}
      initialClaims={claims}
    />
  );
}
