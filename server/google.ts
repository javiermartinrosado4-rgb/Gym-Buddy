import { OAuth2Client, TokenPayload } from "google-auth-library";

export interface GoogleIdentity { sub: string; name?: string }
export function validatedIdentity(payload: (TokenPayload & { nonce?: string }) | undefined, clientId: string, nonce: string): GoogleIdentity {
  if (!payload?.sub || !payload.email_verified || payload.nonce !== nonce || !nonce ||
      payload.aud !== clientId || !["accounts.google.com", "https://accounts.google.com"].includes(payload.iss) ||
      !Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now()) throw new Error("Invalid Google identity");
  return { sub: payload.sub, name: payload.name };
}
export function googleVerifier(clientId: string) {
  const client = new OAuth2Client(clientId);
  return async (credential: string, nonce: string): Promise<GoogleIdentity> => {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();
    return validatedIdentity(payload, clientId, nonce);
  };
}
