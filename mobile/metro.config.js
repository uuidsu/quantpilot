const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Watch the shared directory outside the mobile project
config.watchFolders = [path.resolve(workspaceRoot, "shared")];

// Let Metro resolve modules from both mobile/node_modules and workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Add shared as an extra node module so @shared resolves
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "@shared": path.resolve(workspaceRoot, "shared"),
};

module.exports = config;
