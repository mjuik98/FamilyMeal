import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "test-results/**",
      "playwright-report/**",
      "firestore-debug.log",
      "public/sw.js",
      "public/workbox-*.js",
      "public/swe-worker-*.js",
    ],
  },
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "context/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    rules: {
      "no-console": "error",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/data",
              message: "This compatibility barrel was removed. Import domain-scoped adapters directly from lib/client/*.",
            },
            {
              name: "@/lib/server-meals",
              message: "This compatibility barrel was removed. Import focused server meal modules directly.",
            },
            {
              name: "@/lib/client/http",
              message: "This compatibility wrapper was removed. Import shared auth helpers from lib/platform/http/auth-http.",
            },
            {
              name: "@/lib/env",
              message: "This compatibility wrapper was removed. Import runtime config from lib/config/public-env directly.",
            },
            {
              name: "@/lib/qa",
              message: "This compatibility barrel was removed. Import specific QA modules from lib/qa/* directly.",
            },
            {
              name: "@/lib/server/uploads/meal-image-use-cases",
              message:
                "This legacy server shim was removed. Import the module-local upload adapter from lib/modules/meals/adapters/storage/meal-image-upload.",
            },
            {
              name: "@/lib/client/comments",
              message:
                "This compatibility entrypoint was removed. Import the module-local comment adapter from lib/modules/comments/adapters/firestore/comment-client.",
            },
            {
              name: "@/lib/client/meals",
              message:
                "This compatibility barrel was removed. Import focused client helpers from lib/client/meal-queries, lib/client/meal-mutations, or lib/client/meal-filters.",
            },
            {
              name: "@/lib/client/auth-http",
              message:
                "This compatibility entrypoint was removed. Import shared auth helpers from lib/platform/http/auth-http.",
            },
            {
              name: "@/lib/meal-comments-store",
              message:
                "This compatibility entrypoint was removed. Import the module-local comment subscription store from lib/modules/comments/adapters/firestore/comment-subscription-store.",
            },
            {
              name: "@/lib/activity",
              message:
                "This compatibility entrypoint was removed. Import profile notification helpers from lib/modules/profile/domain/notification-preferences.",
            },
            {
              name: "@/lib/activity-log",
              message:
                "This compatibility entrypoint was removed. Import activity logging helpers from lib/modules/activity/server/activity-log.",
            },
            {
              name: "@/lib/client/activity",
              message:
                "This compatibility entrypoint was removed. Import the module-local profile notification client from lib/modules/profile/adapters/http/profile-notification-client.",
            },
            {
              name: "@/lib/meal-image-policy",
              message:
                "This compatibility entrypoint was removed. Import the meals image policy directly from lib/modules/meals/domain/meal-image-policy.",
            },
            {
              name: "@/lib/meal-form",
              message:
                "This compatibility entrypoint was removed. Import the meals form helpers directly from lib/modules/meals/domain/meal-form.",
            },
            {
              name: "@/lib/meal-draft",
              message:
                "This compatibility entrypoint was removed. Import the meals draft helpers directly from lib/modules/meals/domain/meal-draft.",
            },
            {
              name: "@/lib/meal-copy",
              message:
                "This compatibility entrypoint was removed. Import the meals copy helpers directly from lib/modules/meals/domain/meal-copy.",
            },
            {
              name: "@/lib/meal-errors",
              message:
                "This compatibility entrypoint was removed. Import meal UI error messages directly from lib/modules/meals/ui/meal-error-messages.",
            },
            {
              name: "@/lib/route-errors",
              message:
                "This compatibility entrypoint was removed. Import route error helpers directly from lib/platform/http/route-errors.",
            },
            {
              name: "@/lib/server-auth",
              message:
                "This compatibility entrypoint was removed. Import server auth helpers directly from lib/platform/auth/server-auth.",
            },
          ],
          patterns: [
            {
              group: ["@/lib/server/*"],
              message:
                "Legacy server shims were removed. Import module-local server files or platform auth helpers directly.",
            },
            {
              group: ["@/lib/features/*"],
              message:
                "Legacy feature shims were removed. Import module-local application and ui entrypoints directly.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "context/**/*.{ts,tsx}"],
    ignores: ["app/api/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/firebase-admin"],
              message: "UI layers must not import firebase-admin directly.",
            },
            {
              group: ["@/lib/client/*"],
              message: "UI layers must not import client data modules directly.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/modules/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/lib/qa/runtime",
                "@/lib/qa/fixtures",
                "@/lib/qa/session",
                "@/lib/qa/mode",
                "@/lib/qa/storage",
                "@/lib/client/meals",
              ],
              message:
                "Module runtime adapters must depend on feature-specific QA adapters and focused client helpers instead of QA internals or removed compat barrels directly.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/modules/profile/server/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/firebase-admin"],
              message:
                "Profile server code must depend on module-local Firebase adapters instead of firebase-admin directly.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/modules/comments/server/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/firebase-admin"],
              message:
                "Comment server code must depend on module-local Firestore adapters instead of firebase-admin directly.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/modules/meals/server/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/firebase-admin"],
              message:
                "Meals server code must depend on module-local Firestore or storage adapters instead of firebase-admin directly.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/modules/reactions/server/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/firebase-admin"],
              message:
                "Reaction server code must depend on module-local Firestore adapters instead of firebase-admin directly.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/modules/activity/server/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/firebase-admin"],
              message:
                "Activity server code must depend on module-local Firestore adapters instead of firebase-admin directly.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/logging.ts"],
    rules: {
      "no-console": "off",
    },
  },
];

export default config;
