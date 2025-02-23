const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Adding additional asset and source extensions
config.resolver.assetExts.push('png', 'jpg', 'jpeg'); 

// Make sure 'png' is included
config.resolver.sourceExts.push('cjs', 'js', 'jsx', 'ts', 'tsx', 'mjs');

// Including the transformer with assetPlugins
config.transformer = {
    assetPlugins: ['expo-asset/tools/hashAssetFiles'],
};

module.exports = config;