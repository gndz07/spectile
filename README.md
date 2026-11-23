<p>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/spectile-mark-dark.svg">
    <img src="assets/spectile-mark-light.svg" alt="" width="48" height="48">
  </picture>
</p>

# Spectile

Headless OpenAPI building blocks. Build your own API reference with your own markup and styles, or start from the ready-made theme.

| Package                                   | What it's for                                                                                                                |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [`@spectile/core`](packages/core)         | Load an OpenAPI spec and turn it into a simple model. No UI.                                                                 |
| [`@spectile/headless`](packages/headless) | Search, navigation, schema trees and try-it requests as small stores with accessible prop getters. Works with any framework. |
| [`@spectile/react`](packages/react)       | Unstyled React components and hooks built on the two above.                                                                  |
| [`@spectile/theme`](packages/theme)       | `<ApiReference>`: a complete, styled reference built from the React components, restyled through CSS variables.             |

Each layer builds on the one before it. Use only the ones you need: just `core` for the data, `core` + `headless` for another framework, `react` for your own React UI, or `theme` for a finished reference.

## Quick start

```sh
npm install @spectile/theme react react-dom
```

```tsx
import { ApiReference } from "@spectile/theme"
import "@spectile/theme/styles.css"

export const Docs = () => <ApiReference spec="https://example.com/openapi.json" />
```

See the [theme README](packages/theme) for layouts, try-it options and styling.

## Development

```sh
pnpm install
pnpm build        # build every package
pnpm test         # run every test
pnpm typecheck
pnpm lint
pnpm --filter @spectile/playground dev   # try it in the browser; runs the packages' source
```

The playground opens at http://localhost:3000. `/` is the styled `<ApiReference>`, and `/unstyled.html` uses the `@spectile/react` components without styles. To try the built `dist` instead of the source, run `pnpm build`, then `pnpm --filter @spectile/playground build` and `pnpm --filter @spectile/playground exec vite preview`.
