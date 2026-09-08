import { OAuth2Client } from "google-auth-library";

export interface GoogleIdentity { sub: string; name?: string }
export function googleVerifier(clientId: string) {
  const client = new OAuth2Client(clientId);
  return async (credential: string, nonce: string): Promise<GoogleIdentity> => {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email_verified || (payload as unknown as { nonce?: string }).nonce !== nonce) throw new Error("Invalid Google identity");
    return { sub: payload.sub, name: payload.name };
  };
}
