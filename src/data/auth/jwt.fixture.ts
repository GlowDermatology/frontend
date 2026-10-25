/** Unsigned JWT with the given payload, for tests of the decode-only helpers. */
export function fakeJwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", kid: "k1", typ: "JWT" })}.${encode(payload)}.signature`;
}
