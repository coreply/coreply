const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);
const variant = process.env.variant || "rc";
if (variant !== "web" && variant !== "rc") {
  throw new Error('variant must be "web" or "rc"');
}
const previousResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = previousResolveRequest || context.resolveRequest;
  if (moduleName === "#manage-subscription") {
    return resolve(
      context,
      path.resolve(__dirname, `src/billing/manageSubscription.${variant}.ts`),
      platform,
    );
  }
  return resolve(context, moduleName, platform);
};

module.exports = withUniwindConfig(config, {
  // relative path to your global.css file (from previous step)
  cssEntryFile: "./global.css",
  // (optional) path where we gonna auto-generate typings
  // defaults to project's root
  dtsFile: "./src/uniwind-types.d.ts",
});
