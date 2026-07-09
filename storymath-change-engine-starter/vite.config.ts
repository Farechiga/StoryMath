/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Domain data lives at the repo root under data/. The engine imports the
// canonical problem JSON directly so there is a single source of truth.
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // Allow importing the JSON problem library that sits beside src/.
      allow: [".."],
    },
  },
  test: {
    // Default to Node; UI tests opt into jsdom via a file-level directive.
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    globals: false,
  },
});
