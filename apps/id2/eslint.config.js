import eslintJs from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import importPlugin from "eslint-plugin-import";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["**/node_modules/", ".react-router/**"],
  },
  {
    files: ["**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mts,cts}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true, // Enable JSX parsing globally
        },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
      formComponents: ["Form"],
      linkComponents: [
        { name: "Link", linkAttribute: "to" },
        { name: "NavLink", linkAttribute: "to" },
      ],
      "import/resolver": {
        typescript: {},
        node: {
          extensions: [".js", ".jsx", ".ts", ".tsx"],
        },
      },
      "import/internal-regex": "^~/",
    },
  },

  eslintJs.configs.recommended,

  {
    files: ["**/*.{js,jsx,ts,tsx}"], // Apply to JS/TS files that might contain React
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
    },
    rules: {
      // Spread rules from recommended configs
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs["jsx-runtime"].rules, // Use rules for the new JSX runtime
      ...reactHooksPlugin.configs.recommended.rules,
      ...jsxA11yPlugin.configs.recommended.rules,
    },
    // Settings specific to react/jsx-a11y are often placed in the general settings above
    // but can be placed here if they only apply alongside these plugins/rules.
  },

  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"], // Target only TypeScript files
    plugins: {
      import: importPlugin,
      // @typescript-eslint plugin is already included via tseslint.configs.recommended
    },
    // Apply recommended import plugin rules
    rules: {
      ...importPlugin.configs.recommended.rules,
      ...importPlugin.configs.typescript.rules, // Rules that require TS type info for import plugin

      // Your custom override for @typescript-eslint/no-unused-vars
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Add other TS-specific rule overrides here if needed
    },
    // Settings for import plugin specifically for TS files (if different from JS)
    // Often inherited from the global settings block unless overrides are needed.
    // The `import/resolver` settings defined globally should cover TS.
    // languageOptions: { // Usually not needed here as tseslint.config handles it
    //   parserOptions: {
    //     project: true, // If using type-aware linting rules from import or ts-eslint
    //     // tsconfigRootDir: import.meta.dirname, // Helps ESLint find tsconfig.json relative to eslint.config.js
    //   }
    // }
  },

  // Configuration for the ESLint config file itself (if needed)
  {
    files: ["eslint.config.js"],
    languageOptions: {
      globals: {
        ...globals.node, // Use Node.js globals for the config file
      },
      sourceType: "module", // Assuming eslint.config.js is an ES module
      // If your eslint.config.js MUST be CommonJS, change to 'commonjs'
      // sourceType: "commonjs"
    },
  },
);
