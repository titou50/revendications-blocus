// 1. Dans le handler Realtime (useEffect)
if (payload.eventType === "INSERT") {
  const newClaim = payload.new as Claim;
  if (newClaim.status !== "archived") {
    setClaims((prev) => {
      if (prev.some((c) => c.id === newClaim.id)) return prev;
      return [newClaim, ...prev];
    });
  }
}

// 2. Dans le JSX pour le composant AddClaimDialog
<AddClaimDialog
  establishmentId={establishment.id}
  onCreated={(claim) => {
    setClaims((prev) => {
      if (prev.some((c) => c.id === claim.id)) return prev;
      return [claim, ...prev];
    });
  }}
/>
