module.exports = {
  extends: '@loopback/eslint-config',
  overrides: [
    {
      // Model properties and test fixtures intentionally use snake_case to
      // match the existing PostgreSQL column names (book_id, book_isbn, ...).
      // Renaming them would break the ORM column mapping, so the
      // naming-convention rule is relaxed for these files only.
      files: ['src/models/*.ts', 'src/__tests__/**/*.ts'],
      rules: {
        '@typescript-eslint/naming-convention': 'off',
      },
    },
  ],
};
