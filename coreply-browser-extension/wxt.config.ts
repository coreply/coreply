import { defineConfig } from "wxt";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// See https://wxt.dev/api/config.html
export default defineConfig({
  dev: {
    server: {
      port: 3000,
      strictPort: true,
    },
  },
  manifest: {
    name: "Coreply",
    icons: {
      16: "icon/16.png",
      32: "icon/32.png",
      48: "icon/48.png",
      96: "icon/96.png",
      128: "icon/128.png",
    },
    action: {
      default_icon: {
        16: "icon/16.png",
        32: "icon/32.png",
        48: "icon/48.png",
        96: "icon/96.png",
        128: "icon/128.png",
      },
    },
    permissions: ["storage"],
    host_permissions: ["http://localhost/*", "https://cloud.coreply.app/*"],
    web_accessible_resources: [
      {
        resources: ["/logo.png"],
        matches: ["http://*/*", "https://*/*"],
      },
    ],
  },
  hooks: {
    "build:before": () => {
      // determine current file directory
      const currentFile = fileURLToPath(import.meta.url);
      const currentDir = path.dirname(currentFile);

      // -- begin: rename _expo -> expo inside entrypoints/popup
      const popupDir = path.join(currentDir, "entrypoints", "popup");
      const oldExpoDir = path.join(popupDir, "_expo");
      const newExpoDir = path.join(popupDir, "expo");
      try {
        if (fs.existsSync(oldExpoDir)) {
          if (fs.existsSync(newExpoDir)) {
            fs.rmSync(newExpoDir, { recursive: true, force: true });
          }
          fs.renameSync(oldExpoDir, newExpoDir);
        }
      } catch (err) {
        console.error("Error renaming _expo to expo:", err);
      }

      // replace occurrences of '/_expo/' in index.html to './expo/'
      try {
        const indexHtml = path.join(popupDir, "index.html");
        if (fs.existsSync(indexHtml)) {
          const content = fs.readFileSync(indexHtml, "utf8");
          const updated = content.replace(/\/_expo\//g, "./expo/");
          if (updated !== content) fs.writeFileSync(indexHtml, updated, "utf8");
        }
      } catch (err) {
        console.error("Error updating index.html:", err);
      }

      // copy assets and expo folder to ./public (relative to this file)
      const publicDir = path.join(currentDir, "public");
      const copyDir = (src: string, dest: string, rewriteExpoPaths: boolean) => {
        if (!fs.existsSync(src)) return;
        fs.mkdirSync(dest, { recursive: true });
        for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);
          if (entry.isDirectory()) {
            copyDir(srcPath, destPath, rewriteExpoPaths);
          } else if (entry.isFile()) {
            if (rewriteExpoPaths && entry.name.endsWith(".js")) {
              // Metro embeds lazy chunk URLs in the generated JavaScript.
              const content = fs.readFileSync(srcPath, "utf8");
              fs.writeFileSync(destPath, content.replace(/\/_expo\//g, "/expo/"));
            } else {
              fs.copyFileSync(srcPath, destPath);
            }
          }
        }
      };

      try {
        const publicAssetsDir = path.join(publicDir, "assets");
        const publicExpoDir = path.join(publicDir, "expo");
        fs.rmSync(publicAssetsDir, { recursive: true, force: true });
        fs.rmSync(publicExpoDir, { recursive: true, force: true });
        copyDir(path.join(popupDir, "assets"), publicAssetsDir, false);
        copyDir(newExpoDir, publicExpoDir, true);
      } catch (err) {
        console.error("Error copying assets/expo to public:", err);
      }
    },
    "build:publicAssets": (_, files) => {
      // determine current file directory
      const currentFile = fileURLToPath(import.meta.url);
      const currentDir = path.dirname(currentFile);

      // target directory to walk
      const pnpmDir = path.join(
        currentDir,
        "public",
        "assets",
        "_node_modules",
        ".pnpm",
      );

      // recursive walker to collect all files
      const walk = (dir: string): string[] => {
        if (!fs.existsSync(dir)) return [];
        const results: string[] = [];
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            results.push(...walk(full));
          } else if (entry.isFile()) {
            results.push(full);
          }
        }
        return results;
      };

      const allFiles = walk(pnpmDir);
      for (const abs of allFiles) {
        const absoluteSrc = abs;
        const relativeDest = path.relative(
          path.join(currentDir, "public"),
          abs,
        );
        // add by reference to the files array
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (files as any).push({ absoluteSrc, relativeDest });
      }
    },
  },
});
