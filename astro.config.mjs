import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://anyvol.github.io",
  base: "/saga_site_new",
  integrations: [react()],
});

