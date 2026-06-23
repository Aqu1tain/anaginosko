import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Project Pages are served from /<repo>/, so the production build needs that base.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/anaginosko/" : "/",
  plugins: [react(), tailwindcss()],
}));
