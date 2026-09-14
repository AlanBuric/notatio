import { defineConfig } from 'oxlint';

export default defineConfig({
  plugins: ['eslint', 'typescript', 'unicorn', 'oxc', 'promise', 'import', 'jsdoc'],
  options: {
    typeAware: true,
    typeCheck: true,
  },
  rules: {
    'typescript/no-floating-promises': 'off',
    'jsdoc/require-param-type': 'off',
    'jsdoc/require-property-type': 'off',
    'jsdoc/require-returns-type': 'off',
    'jsdoc/check-tag-names': ['warn', { definedTags: ['defaultValue'] }],
  },
});
