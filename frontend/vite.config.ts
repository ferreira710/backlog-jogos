import react from "@vitejs/plugin-react";
// defineConfig vem de vitest/config para que o bloco `test` seja tipado.
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: {
    // Necessario para o container publicar a porta; sem isso o Vite so ouve em localhost.
    host: true,
    port: 5173,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
