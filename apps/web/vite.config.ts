import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
const siteUrl = (
  process.env.SITE_URL ||
  process.env.APP_URL ||
  "http://localhost:8080"
).replace(/\/$/, "");
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "businessverse-metadata",
      transformIndexHtml: (html) =>
        html
          .replace('href="http://localhost:8080/"', `href="${siteUrl}/"`)
          .replaceAll(
            'content="/1-UBS-UTCC-1.png"',
            `content="${siteUrl}/1-UBS-UTCC-1.png"`,
          )
          .replace(
            "</head>",
            `<meta property="og:url" content="${siteUrl}/"/></head>`,
          ),
    },
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
      "/health": "http://localhost:3000",
      "/sitemap.xml": "http://localhost:3000",
      "/llms.txt": "http://localhost:3000",
    },
  },
  build: { chunkSizeWarningLimit: 650 },
});
