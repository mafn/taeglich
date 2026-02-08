// @ts-check
import { defineConfig, envField } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://taegli.ch",
  redirects: {
    "/status": "/d/2026-02-09",
    "/valentine": "/d/2026-02-14",
  },
  integrations: [
    sitemap({
      filter: (page) =>
        page !== "https://taegli.ch/" &&
        page !== "https://taegli.ch/today/" &&
        page !== "https://taegli.ch/404/" &&
        page !== "https://taegli.ch/imprint/" &&
        page !== "https://taegli.ch/privacy/" &&
        page !== "https://taegli.ch/acknowledgements/",
    }),
  ],
  env: {
    schema: {
      TAEGLICH_SALT: envField.string({ context: "server", access: "secret" }),
      PUBLIC_IMPRINT_NAME: envField.string({
        context: "client",
        access: "public",
      }),
      PUBLIC_IMPRINT_ADDRESS_LINE1: envField.string({
        context: "client",
        access: "public",
      }),
      PUBLIC_IMPRINT_ADDRESS_LINE2: envField.string({
        context: "client",
        access: "public",
      }),
      PUBLIC_IMPRINT_ADDRESS_LINE3: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
      PUBLIC_IMPRINT_EMAIL: envField.string({
        context: "client",
        access: "public",
      }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  devToolbar: {
    enabled: false,
  },
});
