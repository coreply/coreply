const variant = process.env.variant;
if (variant !== "web" && variant !== "rc") {
  throw new Error('variant must be "web" or "rc"');
}

module.exports = {
  dependencies: variant === "web" ? {
    "react-native-purchases": { platforms: { android: null, ios: null } },
    "react-native-purchases-ui": { platforms: { android: null, ios: null } },
  } : {},
};
