import type { Config } from "tailwindcss";
import baseConfig from "@abs/config/tailwind";

const config: Config = {
  ...baseConfig,
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};

export default config;
