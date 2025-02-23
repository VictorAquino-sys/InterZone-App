const { getDefaultConfig } = require('expo/metro-config');

module.exports = (async () => {
    const defaultConfig = await getDefaultConfig(__dirname);

    // Adding additional asset and source extensions
    defaultConfig.resolver.assetExts.push('png', 'jpg', 'jpeg', 'gif', 'svg', 'ttf', 'otf', 'woff', 'woff2');
    defaultConfig.resolver.sourceExts.push('cjs', 'jsx', 'ts', 'tsx', 'mjs', 'md', 'mdx');

    // Including the transformer with assetPlugins
    defaultConfig.transformer = {
        assetPlugins: ['expo-asset/tools/hashAssetFiles'],
    };

    return defaultConfig;
})();
