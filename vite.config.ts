import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": "/src",
      "@lib": "/src/lib",
      "@components": "/src/components",
      "@types": "/src/types.ts",
      "@tiebreakers": "/src/lib/tiebreakers",
      "@standings": "/src/lib/standings",
      "@data": "/src/lib/data",
      "@scenarios": "/src/lib/scenarios",
      "@simulation": "/src/lib/simulation",
      "@constants": "/src/lib/constants",
    },
  },
});
