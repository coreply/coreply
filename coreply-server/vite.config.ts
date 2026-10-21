import { defineConfig } from "vite";
import { uniwind } from "uniwind/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { rnw } from "vite-plugin-rnw";

export default defineConfig({
  resolve: { tsconfigPaths: true },

  optimizeDeps: {
    include: ["coreply-shared-components > react-native-web"],
  },
  plugins: [
    devtools(),

    tailwindcss(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./src/react-app/routes",
    }),
    rnw(),
    cloudflare(),

    uniwind({
      cssEntryFile: "./src/react-app/styles.css",
    }),
  ],
});
