const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer = {
	...config.transformer,
	babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
	...config.resolver,
	assetExts: [...config.resolver.assetExts.filter((ext) => ext !== 'svg'), 'wasm'],
	sourceExts: [...config.resolver.sourceExts, 'svg'],
};

config.server = {
	...config.server,
	enhanceMiddleware: (middleware) => {
		return (req, res, next) => {
			res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
			res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
			return middleware(req, res, next);
		};
	},
};

module.exports = config;
