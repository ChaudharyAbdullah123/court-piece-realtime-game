module.exports = [
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "commonjs",
      globals: {
        node: true,
        es2021: true,
        jest: true,
        console: "readonly",
        process: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        __dirname: "readonly",
        fetch: "readonly",
        require: "readonly",
        module: "readonly"
      }
    },
    rules: {
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "no-console": "off",
      "semi": ["error", "always"],
      "quotes": ["error", "single", { "avoidEscape": true }]
    }
  }
];
