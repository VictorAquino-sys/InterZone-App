const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('png', 'jpg', 'jpeg'); // Make sure 'png' is included

config.transformer = {
    ...config.transformer,
    babelTransformerPath: require.resolve("react-native-qrcode-svg/textEncodingTransformation"),
    _expoRelativeProjectRoot: __dirname
}

module.exports = config;
