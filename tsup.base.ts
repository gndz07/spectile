import type { Options } from "tsup"

export const tsupOptions: Options = {
  entry: ["src/index.ts"],
  format: ["esm"],
  // tsup sets the deprecated baseUrl internally when building declarations
  dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
  sourcemap: true,
  clean: true,
}
