module.exports = {
	root: true,
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:node/recommended'
	],
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint'],
	settings: {
		'import/parsers': {
			'@typescript-eslint/parser': ['.ts', '.tsx'],
		},
		'import/resolver': {
			typescript: {},
		},
	},
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: 'module',
		project: './tsconfig.json',
		ecmaFeatures: {
			"impliedStrict": true
		}
	},
	rules: {
		'@typescript-eslint/indent': ['error', 'tab'],
		'@typescript-eslint/interface-name-prefix': ['warn', { prefixWithI: 'always', allowUnderscorePrefix: true }],
		'node/no-unsupported-features/es-syntax': 'off',
		'node/no-missing-import': 'off'
	},
};
