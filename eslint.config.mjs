import eslint from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/dist-phase3dd/**",
      "**/node_modules/**",
      "coverage/**",
      "output/**",
      "*.zip",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-import-type-side-effects": "error",
    },
  },
  {
    files: ["apps/web/src/**/*.ts"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["**/*.test.ts", "scripts/**/*.{js,mjs}", "*.config.{js,mjs,ts}"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: [
      "scripts/e2e-smoke.mjs",
      "scripts/phase3da-visual-review.mjs",
      "scripts/phase3dd-density-review.mjs",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
  {
    files: ["packages/engine/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["pixi.js", "pixi.js/*"],
              message: "The headless engine cannot depend on PixiJS.",
            },
            {
              group: ["firebase", "firebase/*", "@firebase/*"],
              message: "The headless engine cannot depend on Firebase.",
            },
            {
              group: ["@koikoi4x/web", "@koikoi4x/web/*", "apps/*"],
              message: "The headless engine cannot depend on the browser app.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/deck-format/src/**/*.ts"],
    ignores: ["packages/deck-format/src/node/**/*.ts", "packages/deck-format/src/cli.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["node:*", "pixi.js", "pixi.js/*", "firebase", "firebase/*", "@firebase/*"],
              message:
                "The portable deck-format core cannot depend on Node, rendering, or Firebase.",
            },
            {
              group: ["@koikoi4x/web", "@koikoi4x/web/*", "apps/*"],
              message: "The deck-format core cannot depend on the browser app.",
            },
          ],
        },
      ],
    },
  },
  prettier,
);
