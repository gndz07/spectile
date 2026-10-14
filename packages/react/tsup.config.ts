import { defineConfig } from "tsup";
import { tsupOptions } from "../../tsup.base";

export default defineConfig({ ...tsupOptions, banner: { js: '"use client";' } });
