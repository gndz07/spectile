import { defineConfig } from "tsup";
import { tsupOptions } from "../../tsup.base";

export default defineConfig({
  ...tsupOptions,
  entry: { index: "src/index.ts", loader: "src/loader/index.ts" },
});
