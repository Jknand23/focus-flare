module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'dist-electron', '.eslintrc.js', 'scripts/**'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['react-refresh', '@typescript-eslint'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true, checkJS: false },
    ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    'react-hooks/exhaustive-deps': 'warn',
    'no-console': 'off', // Allow console logs for debugging
    'no-unused-vars': 'off', // Turn off base rule as @typescript-eslint/no-unused-vars handles this
    'no-undef': 'off', // Turn off no-undef as TypeScript handles this
  },
}; 