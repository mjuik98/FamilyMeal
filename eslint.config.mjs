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
              message: "This compatibility wrapper was removed. Import shared auth helpers from lib/client/auth-http.",
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
                "This compatibility shim remains only for legacy callers. Import the module-local upload adapter from lib/modules/meals/adapters/storage/meal-image-upload.",
            },
            {
              name: "@/lib/client/comments",
              message:
                "This compatibility shim remains only for legacy callers. Import the module-local comment adapter from lib/modules/comments/adapters/firestore/comment-client.",
            },
            {
              name: "@/lib/meal-comments-store",
              message:
                "This compatibility shim remains only for legacy callers. Import the module-local comment subscription store from lib/modules/comments/adapters/firestore/comment-subscription-store.",
            },
            {
              name: "@/lib/activity",
              message:
                "This compatibility shim remains only for legacy callers. Import profile notification helpers from lib/modules/profile/domain/notification-preferences.",
            },
            {
              name: "@/lib/activity-log",
              message:
                "This compatibility shim remains only for legacy callers. Import activity logging helpers from lib/modules/activity/server/activity-log.",
            },
            {
              name: "@/lib/client/activity",
              message:
                "This compatibility shim remains only for legacy callers. Import the module-local profile notification client from lib/modules/profile/adapters/http/profile-notification-client.",
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
              group: ["@/lib/server/*", "@/lib/firebase-admin"],
              message: "UI layers must not import server-only modules directly.",
            },
            {
              group: ["@/lib/client/*"],
              message: "UI layers must not import client data modules directly.",
            },
            {
              group: ["@/lib/features/*"],
              message:
                "Production callers must import module-local application and ui entrypoints directly instead of legacy feature shims.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/qa/runtime"],
              message: "Feature services must depend on runtime adapters instead of lib/qa/runtime directly.",
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
                "Module runtime adapters must depend on feature-specific qa adapters and focused client adapters instead of qa internals or compat barrels directly.",
            },
            {
              group: ["@/lib/features/*"],
              message:
                "Production callers must import module-local application and ui entrypoints directly instead of legacy feature shims.",
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
    files: ["lib/logging.ts"],
    rules: {
      "no-console": "off",
    },
  },
];

export default config;
