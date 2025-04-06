import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  sourcemap: true,
  clean: true,
  format: ["esm"],
  external: [
    "dotenv",
    "fs",
    "path",
    "sqlite3",
    "sqlite",
    // Add other modules you want to externalize
  ],
}); 