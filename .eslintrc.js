module.exports = {
	parser: "@typescript-eslint/parser",
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: "module",
	},
	extends: ["plugin:prettier/recommended", "plugin:@typescript-eslint/recommended"],
	rules: {
		quotes: [2, "double", { avoidEscape: true }],
		"@typescript-eslint/no-explicit-any": "off",
		"unused-imports/no-unused-imports": "error",
		curly: [2, "multi-or-nest"],
	},
	plugins: ["unused-imports", "jest-extended"],
};
