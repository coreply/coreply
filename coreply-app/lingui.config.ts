import { defineConfig } from "@lingui/cli";
import { locales } from "./src/i18n/locales";

export default defineConfig({
  sourceLocale: "en",
  locales: [...locales],
  catalogs: [
    { path: "<rootDir>/locales/{locale}", include: ["<rootDir>/src"] },
    {
      path: "<rootDir>/../coreply-shared-components/locales/{locale}",
      include: ["<rootDir>/../coreply-shared-components/src"],
    },
    {
      path: "<rootDir>/../libcoreply/locales/{locale}",
      include: ["<rootDir>/../libcoreply/src"],
    },
  ],
  catalogsMergePath: "<rootDir>/src/i18n/{locale}",
  compileNamespace: "ts",
});
