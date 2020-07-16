module.exports = {
  "env": {
    "browser": true,
    "es6": true
  },
  "extends": [
    "plugin:react/recommended",
    "airbnb"
  ],
  "globals": {
    "Atomics": "readonly",
    "SharedArrayBuffer": "readonly"
  },
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaFeatures": {
      "jsx": true,
      "tsx": true
    },
    "ecmaVersion": 2018,
    "sourceType": "module"
  },
  "plugins": [
    "react",
    "@typescript-eslint"
  ],
  "rules": {
    "semi": ["error", "always"],
    "quotes": ["error", "single"],
    "comma-dangle": ["error", "never"],
    "object-curly-spacing": ["error", "always"],
    "react/jsx-filename-extension": [1, { "extensions": [".tsx", ".jsx"] }],
    "react/destructuring-assignment": [0, 'never'],
    // prop-types check reports many false positives.
    // We use typescript for prop typechecking, so disable it.
    "react/prop-types": [0, {}],
    "import/extensions": [
      "error",
      "ignorePackages",
    ],
    "no-unused-vars": [
      "error",
      {
        "argsIgnorePattern": "[uU]nused",
        "varsIgnorePattern": "[uU]nused"
      },
    ],
    "no-console": [ "warn" ]
  },

  // https://github.com/typescript-eslint/typescript-eslint/issues/46
  "overrides": [
    {
      "files": ['*.ts', '*.tsx'],
      "rules": {
        '@typescript-eslint/no-unused-vars': [2, { args: 'none' }]
      }
    }
  ]
};
