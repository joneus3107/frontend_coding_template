import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: "src",
  base: "/assets/",
  build: {
    outDir: "../_site/assets",
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "src/js/main.js"),
        style: path.resolve(__dirname, "src/scss/main.scss"),
      },
    },
  },
});
