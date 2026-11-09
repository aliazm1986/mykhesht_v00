import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const eslintConfig = [...compat.extends("next/core-web-vitals")];
const projectConfig = [
  {
    ignores: [
      ".next/**",
      "dist/**",
      ".wrangler/**",
      ".sites-runtime/**",
      "node_modules/**",
      "public/**",
      "vendor/**",
    ],
  },
  ...eslintConfig,
];

export default projectConfig;
