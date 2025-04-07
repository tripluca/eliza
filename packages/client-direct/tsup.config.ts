import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
    dts: false,
    format: ["esm"], // Ensure you're targeting CommonJS
    platform: 'node', // Add platform node
    external: [
        "dotenv", // Externalize dotenv to prevent bundling
        "fs", // Externalize fs to use Node.js built-in module
        "path", // Externalize other built-ins if necessary
        "stream", // Externalize stream
        "ws", // Externalize ws
        "@reflink/reflink",
        "@node-llama-cpp",
        "https",
        "http",
        "agentkeepalive",
        "safe-buffer",
        // Add other modules you want to externalize
    ],
});
