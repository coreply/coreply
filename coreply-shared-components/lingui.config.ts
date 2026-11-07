export default {
  sourceLocale: "en",
  locales: ["en", "de", "es", "fr", "sv", "zh-HK", "zh-TW"],
  catalogs: [
    {
      path: "<rootDir>/locales/{locale}",
      include: ["<rootDir>/src"],
    },
  ],
  compileNamespace: "ts",
};
