module.exports = {
	'env': {
		'browser': true,
		'es2021': true
	},
	'extends': [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended'
	],
	'parser': '@typescript-eslint/parser',
	'parserOptions': {
		'ecmaVersion': 12,
		'sourceType': 'module'
	},
	'plugins': [
		'@typescript-eslint'
	],
	'rules': {
		'@typescript-eslint/no-non-null-assertion': 'off',

        'unicorn/numeric-separators-style': 'off',
        'unicorn/prefer-node-protocol': 'off',
        'unicorn/prefer-module': 'off',
        'unicorn/no-null': 'off',
        'unicorn/prefer-number-properties': 'off',
        'unicorn/prevent-abbreviations': 'off',
        'unicorn/consistent-function-scoping': 'off',

        'prettier/prettier': 'warn',

        'curly': ['warn', 'multi'],
        'one-var': ['warn', 'consecutive'],
        'yoda': 'warn',
        'array-callback-return': 'error',
        'default-case-last': 'error',
        'dot-notation': 'error',
        'eqeqeq': 'error',
        'guard-for-in': 'off',
        'max-classes-per-file': 'error',
		'prefer-const': 'off',

        'no-useless-backreference': 'error',
        'no-unsafe-optional-chaining': 'error',
        'no-unreachable-loop': 'error',
        'no-template-curly-in-string': 'error',
        'no-promise-executor-return': 'error',
        'no-prototype-builtins': 'error',
        'no-case-declarations': 'error',
        'no-div-regex': 'error',
        'no-regex-spaces': 'error',
        'no-control-regex': 'error',
        'no-eval': 'error',
        'no-extend-native': 'error',
        'no-implied-eval': 'error',
        'no-iterator': 'error',
        'no-labels': 'error',
        'no-else-return': 'warn',
        'object-shorthand': 'warn',
        'operator-assignment': 'warn',

        'no-fallthrough': 'off',

        'prefer-destructuring': [
            'warn',
            {
                'object': true,
                'array': true
            }
        ]
	}
};
