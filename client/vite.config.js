import path from "path";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV == "production" ? "/ui/" : "/",
  server: {
    allowedHosts:["hari2483-3000.gangboyz.in"],
    proxy: {
      // "/api": "https://wb.nekhop.com/",
      "/api": "http://localhost:3002/",
      "/v14.0": "http://localhost:3002/",
      // "/v14.0": "https://wb.nekhop.com/",
    },
  },
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@components": path.resolve(__dirname, "./src/components"),
      "@pages": path.resolve(__dirname, "./src/pages"),
      "@framework": path.resolve(__dirname, "./src/framework"),
      "@api": path.resolve(__dirname, "./src/framework/api"),
      "@common": path.resolve(__dirname, "./src/components/common"),
      "@utils": path.resolve(__dirname, "./src/utils"),
    },
  },
});
