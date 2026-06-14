import {defineConfig} from "vitest/config";
import {fileURLToPath} from "node:url";

export default defineConfig({
    resolve: {
        // Mirror the tsconfig "@/*" -> "src/*" path alias.
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    // Logic tests need no CSS pipeline; skip the project's Tailwind PostCSS config.
    css: {postcss: {plugins: []}},
    test: {
        environment: "node",
        include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    },
});
