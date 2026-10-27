/**
 * Liveness probe for the container healthcheck and the edge proxy: answers
 * from the running Node server without touching Django, so a backend outage
 * never restarts the frontend. `version` is the commit the image was built
 * from (`GLOWDERMA_BUILD_SHA` build arg).
 */
export function GET(): Response {
  return Response.json(
    { status: "ok", version: process.env.GLOWDERMA_BUILD_SHA || "dev" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
