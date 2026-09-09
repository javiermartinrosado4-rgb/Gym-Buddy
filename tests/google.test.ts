import test from "node:test";
import assert from "node:assert/strict";
import { AddressInfo } from "node:net";
import { createGymServer } from "../server/app";
import { googleVerifier, validatedIdentity } from "../server/google";
import sharp from "sharp";

test("Google claims require the expected audience, issuer, expiry, verified email and nonce", () => {
  const payload = { sub: "stable-sub", aud: "web-client", iss: "https://accounts.google.com", exp: Math.floor(Date.now() / 1000) + 300, iat: Math.floor(Date.now() / 1000), email_verified: true, nonce: "one-use", name: "Test" };
  assert.equal(validatedIdentity(payload, "web-client", "one-use").sub, "stable-sub");
  for (const changed of [{ aud: "attacker" }, { iss: "https://evil.invalid" }, { exp: 1 }, { email_verified: false }, { nonce: "different" }, { sub: "" }]) {
    assert.throws(() => validatedIdentity({ ...payload, ...changed }, "web-client", "one-use"));
  }
});

test("official Google verifier rejects a malformed identity token", async () => {
  await assert.rejects(googleVerifier("test-client")("forged-token", "nonce"));
});

test("Google login verifies credentials, rejects replay and reuses the stable identity", async () => {
  const server = createGymServer({ googleClientId: "test-client", verifyGoogle: async credential => {
    if (credential !== "verified-token") throw new Error("Invalid signature");
    return { sub: "google-subject", name: "Test Google" };
  } });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = async (path: string, data?: unknown, token?: string, method = data ? "POST" : "GET") => {
    const response = await fetch(url + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: data ? JSON.stringify(data) : undefined });
    return { status: response.status, data: await response.json() };
  };
  try {
    const first = await call("/auth/google/config");
    const login = await call("/auth/google", { credential: "verified-token", nonce: first.data.nonce });
    assert.equal(login.status, 200);
    assert.equal((await call("/auth/google", { credential: "verified-token", nonce: first.data.nonce })).status, 401);
    const second = await call("/auth/google/config");
    assert.equal((await call("/auth/google", { credential: "forged", nonce: second.data.nonce })).status, 401);
    const third = await call("/auth/google/config");
    const again = await call("/auth/google", { credential: "verified-token", nonce: third.data.nonce });
    assert.equal(again.data.user.id, login.data.user.id);
    const updated = await call("/me", { name: "Test", bio: "", level: "beginner", avatar: "wave" }, login.data.token, "PATCH");
    assert.equal(updated.status, 200);
    assert.equal((await call("/me", undefined, again.data.token)).data.avatar, "wave");
    const png = await sharp({ create: { width: 5, height: 5, channels: 3, background: "red" } }).png().toBuffer();
    const photo = await call("/me", { name: "Test", bio: "", level: "beginner", avatar: `data:image/png;base64,${png.toString("base64")}` }, login.data.token, "PATCH");
    assert.equal(photo.status, 200);
    assert.match(photo.data.avatar, /^data:image\/jpeg;base64,/);
    assert.equal((await call("/me", { name: "Test", bio: "", level: "beginner", avatar: "javascript:bad" }, login.data.token, "PATCH")).status, 400);
    await call("/auth/logout", {}, login.data.token);
    assert.equal((await call("/me", undefined, login.data.token)).status, 401);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
