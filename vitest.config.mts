import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const resolvePath = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": resolvePath("./src"),
      // Tests import server modules directly; use the empty server build of
      // the `server-only` marker, as Next.js does in Server Components.
      "server-only": resolvePath("./node_modules/server-only/empty.js"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // The persistent module cache keys a transformed file by its own content, so a test that
    // discovers files with `import.meta.glob` (copy-parity.test.ts) would keep the list of copy
    // modules it saw first and miss every module added later. Transform from scratch instead.
    fsModuleCache: false,
  },
});
