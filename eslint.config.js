import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/**', 'lib/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    extends: [tseslint.configs.recommendedTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // The `@/` alias is defined for tests only. Using it here would emit an
      // unresolvable specifier into the published declarations.
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@/*'], message: 'Use a relative import inside src/.' }] },
      ],
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
  {
    files: ['*.config.{js,ts}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  prettier,
);
