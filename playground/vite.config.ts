import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const packages = fileURLToPath(new URL("../packages", import.meta.url))

// The dev server runs the packages' source; `vite build` still uses their `dist`.
const sourceAliases = [
  { find: /^@spectile\/core\/loader$/, replacement: `${packages}/core/src/loader/index.ts` },
  { find: /^@spectile\/([\w-]+)$/, replacement: `${packages}/$1/src/index.ts` },
]

export default defineConfig(({ command }) => ({
  plugins: [react()],
  resolve: command === "serve" ? { alias: sourceAliases, dedupe: ["react", "react-dom"] } : {},
  server: { port: 3000, open: true },
  build: { rolldownOptions: { input: ["index.html", "unstyled.html", "theme.html"] } },
}))
