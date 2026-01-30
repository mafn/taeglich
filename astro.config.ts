// @ts-check
import { defineConfig, envField } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://taegli.ch",
  integrations: [
    sitemap({
      filter: (page) =>
        page !== "https://taegli.ch/" &&
        page !== "https://taegli.ch/today/" &&
        page !== "https://taegli.ch/404/",
    }),
  ],
  env: {
    schema: {
      TAEGLICH_SALT: envField.string({ context: "server", access: "secret" }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
