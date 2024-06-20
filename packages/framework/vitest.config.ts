import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
    },
    define: {
        'process.env.NODE_ENV': JSON.stringify("production")
    }
});
