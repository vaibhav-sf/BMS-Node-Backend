module.exports = {
  extends: '@loopback/eslint-config',
  overrides: [
    {
      files: ['src/models/**/*.ts', 'src/__tests__/**/*.ts'],
      rules: {
        '@typescript-eslint/naming-convention': 'off',
      },
    },
  ],
};
