const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
	expoConfig,
	{
		ignores: ['dist/*', '.expo/*', '.claude/*', 'scripts/*'],
	},
	{
		rules: {
			'react/jsx-curly-brace-presence': ['error', { props: 'always', children: 'never' }],
		},
	},
]);
