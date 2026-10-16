# Spectile

Headless OpenAPI building blocks. Instead of configuring a finished docs app, build your own API reference with your own markup and styles.

| Package                                   | What it's for                                                                                                                |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [`@spectile/core`](packages/core)         | Load an OpenAPI spec and turn it into a simple model. No UI.                                                                 |
| [`@spectile/headless`](packages/headless) | Search, navigation, schema trees and try-it requests as small stores with accessible prop getters. Works with any framework. |
| [`@spectile/react`](packages/react)       | Unstyled React components and hooks built on the two above.                                                                  |

Each layer builds on the one before it. Use only the ones you need: just `core` for the data, `core` + `headless` for another framework, or all three for React.

## Development

```sh
pnpm install
pnpm build        # build every package
pnpm test         # run every test
pnpm typecheck
pnpm --filter @spectile/playground dev   # try it in the browser; runs the packages' source
```
