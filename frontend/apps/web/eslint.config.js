import { nextJsConfig } from "@workspace/eslint-config/next-js"

/** @type {import("eslint").Linter.Config} */
export default [
  ...nextJsConfig,
  {
    ignores: ["playwright-report/**", "test-results/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*/data/*"],
              message: "Import feature fixtures only from that feature's mock service adapter.",
            },
          ],
        },
      ],
    },
  },
]
