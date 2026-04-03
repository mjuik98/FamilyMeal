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
