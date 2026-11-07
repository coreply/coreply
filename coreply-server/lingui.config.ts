import { defineConfig } from "@lingui/cli";
import { locales } from "./src/react-app/i18n/locales";

export default defineConfig({
  sourceLocale: "en",
  locales: locales.map(({ id }) => id),
  catalogs: [
    { path: "<rootDir>/locales/{locale}", include: ["<rootDir>/src/react-app"] },
    {
      path: "<rootDir>/../coreply-shared-components/locales/{locale}",
      include: ["<rootDir>/../coreply-shared-components/src"],
    },
    {
      path: "<rootDir>/../libcoreply/locales/{locale}",
      include: ["<rootDir>/../libcoreply/src"],
    },
  ],
  catalogsMergePath: "<rootDir>/src/react-app/i18n/{locale}",
  compileNamespace: "ts",
});
