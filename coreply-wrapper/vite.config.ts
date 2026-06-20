import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "../coreply-app/android/app/src/main/assets/",
    emptyOutDir: true,
  },
  base: "./",
});
