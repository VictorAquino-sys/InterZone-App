const { getDefaultConfig } = require("expo/metro-config");

module.exports = (async () => { 
    const defaultConfig = await getDefaultConfig(__dirname);

    // Ensure Metro recognizes PNG files
    defaultConfig.resolver.assetExts.push("png", "PNG");

    // Ensure Metro recognizes CommonJS modules (cjs)
    defaultConfig.resolver.sourceExts.push('cjs');

    return defaultConfig;

})();