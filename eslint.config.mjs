import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules', 'playwright-report', 'test-results', 'blob-report', 'performance', 'scripts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='waitForTimeout']",
          message: 'No hardcoded waits. Wait for a condition (locator, response, expect.poll) instead.',
        },
        {
          selector: "CallExpression[callee.object.name='test'][callee.property.name='only']",
          message: 'test.only must not be committed.',
        },
      ],
    },
  },
);
