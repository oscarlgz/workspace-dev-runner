module.exports = {
  extends: '@oscarltz/eslint-config/node',
  parserOptions: {
    project: require.resolve('./tsconfig.json'),
  },
  rules: {
    'no-console': 'off',
    'no-process-exit': 'off',
    'security/detect-non-literal-fs-filename': 'off',
  },
}
