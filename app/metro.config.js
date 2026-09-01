const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add wasm support for expo-sqlite web fallback
if (config.resolver && config.resolver.assetExts) {
  config.resolver.assetExts.push('wasm');
}

module.exports = config;
