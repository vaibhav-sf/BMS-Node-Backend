module.exports = {
  extends: '@loopback/eslint-config',
  overrides: [
    {
      files: ['src/models/**/*.ts'],
      rules: {
        '@typescript-eslint/naming-convention': 'off',
      },
    },
  ],
};
