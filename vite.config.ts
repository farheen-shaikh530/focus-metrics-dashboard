import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths()
 

  ],
  // optional, but helps when deploying behind a subpath
  server: { host: true, port: 5173 }
});