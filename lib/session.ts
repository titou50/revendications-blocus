import { createHash, randomUUID } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "rv_sid";

export async function getSessionId(): Promise<string> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? randomUUID();
}

export function hashSession(sessionId: string): string {
  return createHash("sha256").update(sessionId).digest("hex").slice(0, 32);
}
