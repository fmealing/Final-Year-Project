const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// nativewind@4.1.23 ships react-native@0.85.0 inside its own tarball.
// Metro follows Node resolution and finds that nested copy first, then
// chokes on RN 0.85's `match` syntax that metro 0.82 can't parse.
//
// resolveRequest intercepts EVERY module resolution. For a fixed set of
// packages we always redirect to the top-level copy, regardless of where
// the importing file lives in the tree.

const FORCE_TOP_LEVEL = new Set([
  "react-native",
  "react",
  "react-native-reanimated",
  "scheduler",
]);

const defaultResolver = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Check if the bare package name (or a subpath of it) is in our list
  const pkg = moduleName.startsWith("@")
    ? moduleName.split("/").slice(0, 2).join("/")  // @scope/pkg
    : moduleName.split("/")[0];                     // pkg  or  pkg/sub

  if (FORCE_TOP_LEVEL.has(pkg)) {
    const topLevel = path.resolve(__dirname, "node_modules", moduleName);
    try {
      return {
        filePath: require.resolve(topLevel),
        type: "sourceFile",
      };
    } catch {
      // If the exact path doesn't resolve, fall through to default
    }
  }

  // Default resolution for everything else
  if (defaultResolver) return defaultResolver(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
