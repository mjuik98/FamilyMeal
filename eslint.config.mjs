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
              message: "Import domain-scoped adapters directly from lib/client/* instead of the compat barrel.",
            },
            {
              name: "@/lib/server-meals",
              message: "Import focused server meal modules directly instead of the compat barrel.",
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
