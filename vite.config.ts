import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Servi à la racine d'anaginosko.fr (VPS) -> base "/".
export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
});
