import { defineConfig } from "vite";
import { uniwind } from "uniwind/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { rnw } from "vite-plugin-rnw";
import { lingui } from "@lingui/vite-plugin";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // Shared components must use the same React and Lingui context as the web app.
    dedupe: ["react", "react-dom", "@lingui/react"],
    alias: [
      // Shared icons use DOM SVGs on the server, not native SVG modules.
      { find: /^lucide-react-native$/, replacement: "lucide-react" },
    ],
  },

  optimizeDeps: {
    include: ["coreply-shared-components > react-native-web"],
  },
  plugins: [
    lingui({ macroTransform: true }),
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
