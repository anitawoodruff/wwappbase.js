module.exports = {
	"env": {
		"jest": true,
		"node": true,
		"es6": false,
		"browser": true
	},
	 "globals": { // these are needed to avoid errors in puppeteer/node files
		"window": true,
		"document": true,
		"page": true,
		"browser": true,
		"context": true,
		"jestPuppeteer": true
	},
	"parser": "babel-eslint",
	"parserOptions": {
		"ecmaVersion": 9,// 2018 version. Can still be transpiled to 6 (2015) by Babel 
		"sourceType": "module",
		"ecmaFeatures": {
			"jsx": true
		}
	},
	"extends": "airbnb",
	"plugins": [
		"react",
		"jsx-a11y",
		"import",
	],
	"settings": {
		"import/resolver": {
			"node": {
				"extensions": [".js", ".jsx", ".ts", ".tsx"],
				"moduleDirectory": ["node_modules", "src/"],
			},
		},
	},
	"rules": {
		"constructor-super": "warn", // DataClass has use-cases for not calling super
		"jsx-a11y/tabindex-no-positive": "off",
		"arrow-body-style": "off",
		"block-spacing": "warn",
		"no-empty-pattern": "warn",
		"arrow-parens": "off",
		"brace-style": "warn",
		"camelcase": "off", // we use camelCase, but we also break it in places, e.g. myFn2_subFn()
		"class-methods-use-this": "off",
		"comma-dangle": "off",
		"comma-spacing": "off",
		"consistent-return": "warn",
		"default-case": "off",
		"func-names": "off",
		"function-paren-newline": "off",
		"implicit-arrow-linebreak": "off",
		"import/extensions": "warn",
		"import/first": "warn",
		"import/newline-after-import": "warn",
		"import/no-named-as-default-member": "off",
		"import/no-named-as-default": "off",
		"import/order": "warn",
		"import/prefer-default-export": "warn",
		"indent": ["warn", "tab"],
		"jsx-a11y/alt-text": "warn",
		"jsx-a11y/anchor-is-valid": "warn",
		"jsx-a11y/click-events-have-key-events": "warn",
		"jsx-a11y/img-redundant-alt": "warn",
		"jsx-a11y/label-has-associated-control": "off",
		"jsx-a11y/label-has-for": "warn",
		"jsx-a11y/media-has-caption": "warn",
		"jsx-a11y/no-static-element-interactions": "warn",
		"jsx-a11y/control-has-associated-label":"warn",
		"jsx-quotes": "off",
		"key-spacing": "off",
		"keyword-spacing": "off",
		"max-depth": ["warn", 4],
		"max-len": ["warn", 340],
		"max-nested-callbacks": ["warn", 4],
		"max-classes-per-file": "off",
		"no-confusing-arrow": "off",
		"no-continue": "off",
		"no-extra-bind": "warn",
		"no-loop-func": "off",
		"no-lonely-if": "warn",
		"no-mixed-operators": "off",
		"no-multi-assign": "off", /* broken - seems to cause errors in linting */
		"no-nested-ternary": "off",
		"no-param-reassign": "off",
		"no-plusplus": "off",
		"no-redeclare": "warn",
		"no-restricted-globals": "warn", // triggers on isNan()
		"no-return-assign": "off",
		"no-tabs": "off",
		"no-trailing-spaces": "off",
		"no-underscore-dangle": "off",
		"no-unused-vars": "warn",
		"no-use-before-define": "warn",
		"no-useless-concat": "warn",
		"no-useless-constructor": "warn",
		"no-useless-return": "off",
		"lines-between-class-members": "off",
		"no-use-before-define": "off",
		"no-var": "warn",
		"one-var": "off",
		"object-curly-newline": "off",
		"object-curly-spacing": "off",
		"object-property-newline": "off",
		"object-shorthand": "off",
		"one-var-declaration-per-line": "off",
		"one-var": "warn",
		"operator-assignment": "warn",
		"operator-linebreak": "off",
		"jsx-a11y/anchor-has-content": "warn", // what about in-page name-only anchors?
		"padded-blocks": "warn",
		"prefer-arrow-callback": "off",
		"prefer-const": "off",
		"prefer-destructuring": "off",
		"prefer-object-spread": "warn",
		"prefer-promise-reject-errors": "warn",
		"prefer-template": "off",
		"quote-props": "warn",
		"quotes": "off",
		"radix": "off",
		"react/button-has-type": "warn",
		"react/destructuring-assignment": "off",
		"react/forbid-prop-types": "warn",
		"react/jsx-boolean-value": "warn",
		"react/jsx-closing-bracket-location": "warn",
		"react/jsx-closing-tag-location": "off",
		"react/jsx-curly-spacing": "off",
		"react/jsx-curly-newline": "warn",
		"react/jsx-curly-brace-presence": "warn",
		"react/jsx-filename-extension": [2, { "extensions": [".js", ".jsx", ".ts", ".tsx"] }],
		"react/jsx-first-prop-new-line": "off",
		"react/jsx-indent-props": ["warn", "tab"],
		"react/jsx-indent": ["warn", "tab"],
		"react/jsx-max-props-per-line": "off",
		"react/jsx-no-bind": "warn",
		"react/jsx-no-target-blank": "warn",
		"react/jsx-one-expression-per-line": "off",
		"react/jsx-props-no-spreading": ["warn", {explicitSpread:'ignore'}],
		"react/jsx-space-before-closing": "warn",
		"react/jsx-tag-spacing": "warn",
		"react/jsx-wrap-multilines": "off",
		"react/no-array-index-key": "off",
		"react/no-array-index-key": "warn",		
		"react/no-multi-comp": "off",
		"react/no-unescaped-entities": "warn",
		"react/no-unused-state": "warn",
		"react/prefer-stateless-function": "warn",
		"react/prop-types": "off",
		"react/self-closing-comp": "warn",
		"react/sort-comp": "warn",
		"space-before-blocks": "warn",
		"space-before-function-paren": "off",
		"space-comment": "off",
		"space-in-parens": "off",
		"space-infix-ops": "off",
		"space-unary-ops": "off",
		"spaced-comment": "off",
		"vars-on-top": "warn",
	},
	"overrides": [
		{
			"files": ["*.ts", "*.tsx"],
			"extends": [
				"eslint:recommended",
				"plugin:@typescript-eslint/eslint-recommended",
				"plugin:@typescript-eslint/recommended"
			],
			"parser": "@typescript-eslint/parser",
			"parserOptions": {
				"ecmaFeatures": { "jsx": true },
				"ecmaVersion": 2018,
				"sourceType": "module",
				"project": "./tsconfig.json",
			},
			"plugins": ["@typescript-eslint"],
		}
	]
};