# @spectile/theme

A complete, styled API reference for React: navigation, search, schema trees, examples and try-it, ready to drop in. It's built from the [`@spectile/react`](../react) components, and you restyle it through CSS variables.

```sh
npm install @spectile/theme react react-dom
```

Requires React 19, and a browser from 2024 or later: colors use CSS `light-dark()`, so older browsers show none.

## Quick start

```tsx
import { ApiReference } from "@spectile/theme"
import "@spectile/theme/styles.css"

export const Docs = () => <ApiReference spec="https://example.com/openapi.json" />
```

That's all: navigation, search, schemas, examples and try-it, in light and dark. Import the CSS once.

`spec` also takes the document itself, so a spec file in your project works too:

```tsx
import openapi from "./openapi.json"

export const Docs = () => <ApiReference spec={openapi} />
```

The reference scrolls with the page, and its sidebar and panel stick to the top of the window, so it reads best as the page's main content rather than inside a scrolling box.

It styles only itself, not the page around it. To keep the browser's default margin and a light page from showing around a dark reference, give the page its colors:

```css
:root {
  color-scheme: light dark;
}

body {
  margin: 0;
  background: var(--spectile-color-bg);
}
```

If you force a mode with `data-theme` on `<html>`, set `color-scheme` to match.

## Props

| Prop             | Default    |                                                                                                                       |
| ---------------- | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| `spec`           |            | An OpenAPI 3.x or Swagger 2.0 document: a URL, JSON or YAML text, or a parsed object. Loaded with `@spectile/core/loader`, which is imported only when needed. |
| `model`          |            | A ready `SpecModel` from `normalize`, instead of `spec`                                                               |
| `layout`         | `sidebar`  | `sidebar` shows one operation at a time; `stacked` lists them all in one column, opened in place                      |
| `tryIt`          | `panel`    | Where the request form goes: `panel`, `drawer`, `inline`, or `false` to hide it                                       |
| `tryItOptions`   |            | `{ fetch, baseUrl, storage, storageKey }`; see `createTryIt` in [`@spectile/headless`](../headless#try-it)              |
| `searchShortcut` | on in `sidebar` | `/` focuses search                                                                                               |
| `renderMarkdown` | react-markdown | `(markdown) => ReactNode` for descriptions. The default leaves raw HTML out.                                       |
| `logo`           |            | Shown before the API title, e.g. `<img src="/logo.svg" alt="" />`. An `<img>` or `<svg>` is `--spectile-logo-height` (24px) tall. Use `alt=""` when the title already names the API. |

Pass `spec` or `model`, not both. With `spec`, the reference shows a loading state, a failure with a "Try again" button, and any warnings the spec produced. A `spec` object is reloaded when its identity changes, so keep it stable (a constant, or `useMemo`). The same goes for `model`: a new one starts the reference over, losing the open operation, what people typed into try-it and their responses. `tryItOptions` is read when the spec or model is first ready, so later changes to it are ignored.

If the spec's servers are relative (`/api/v3`), try-it resolves them against the spec's URL, as OpenAPI says. With `model`, or a document passed as an object or text, they resolve against the page; set `tryItOptions.baseUrl` to change that.

Every other prop goes to the root `<div>`, so `className`, `style`, `id` and `data-theme` work as usual.

```tsx
<ApiReference
  spec="https://example.com/openapi.json"
  layout="stacked"
  tryIt="inline"
  tryItOptions={{ storage: sessionStorage }}
  className="docs"
/>
```

`storage: sessionStorage` keeps the credentials people type in until the tab closes; without it, a reload clears them.

### Deep links

Picking an operation writes `#operationId` to the URL, replacing the current history entry rather than adding one, and a link to `#operationId` opens it. In the stacked layout, the operation also scrolls into view. A hash in the URL when the page loads is applied right after the reference mounts, so a server render and the browser's first render match.

The hash belongs to the reference, so don't combine it with a hash-based router on the same page.

## Layouts and widths

`layout` and `tryIt` are preferences. The reference measures its own width, not the window's, and falls back when there isn't room:

| Width           | Navigation                                                     | Try it                                                       |
| --------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| 1280px and up   | sidebar                                                        | as set; `panel` is a right-hand column with Example and Try it tabs |
| 960 to 1279px   | sidebar                                                        | `panel` becomes `drawer`                                     |
| 600 to 959px    | a top bar; the operations open in a drawer                    | drawer                                                       |
| below 600px     | the same top bar                                               | a bottom sheet with Request and Response tabs                |

The stacked layout never has a sidebar. `inline` puts a collapsible form under the operation's description, with the response beside it from 960px.

The same rules are exported as a pure function, for when your own layout needs to match:

```ts
import { BREAKPOINTS, resolveLayout } from "@spectile/theme"

resolveLayout({ layout: "sidebar", tryIt: "panel", width: 1000 })
// { layout: "sidebar", navigation: "sidebar", tryIt: "drawer" }
```

## Styling

### CSS files

| Import                       |                                                                                  |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `@spectile/theme/styles.css` | the tokens and every component style                                             |
| `@spectile/theme/tokens.css` | the tokens alone, for styling `@spectile/react` components yourself              |
| `@spectile/theme/fonts.css`  | optional: self-hosts Inter and JetBrains Mono and puts them first in the font stacks |

Without `fonts.css`, the reference uses the system fonts. `fonts.css` imports the `@fontsource` packages by name, so it needs a bundler that resolves CSS imports from `node_modules` (Vite, Next.js, webpack with css-loader). Served as a plain file, link those packages' CSS yourself.

### Tokens

Everything is drawn from `--spectile-*` custom properties. They're declared with zero specificity, so any rule of yours wins. Set them on `.spectile` (the root) or any ancestor:

```css
.spectile {
  --spectile-color-accent: light-dark(#6a3fc8, #b9a3f5);
  --spectile-color-accent-hover: light-dark(#52299f, #d4c6fa);
  --spectile-color-link: var(--spectile-color-accent);
  --spectile-color-focus-ring: var(--spectile-color-accent);
  --spectile-font-sans: "Inter", system-ui, sans-serif;
  --spectile-radius-md: 10px;
}
```

Each name below is prefixed with `--spectile-`, e.g. `--spectile-color-accent`.

| Group  | Tokens                                                                                                                        |
| ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Color  | `color-bg`, `color-text`, `color-accent`, `color-link`, `color-border`…; a text color and its background come in pairs: `color-method-get` and `color-method-get-bg`, likewise for every `method-*`, `status-*`, `deprecated`, `required` and `accent-subtle` |
| Code   | `color-code-bg`, `color-code-text`, `color-code-key`, `color-code-string`, `color-code-number`, `color-code-muted`, `color-code-missing` |
| Type   | `font-sans`, `font-mono`, `font-size-xs` to `font-size-2xl`, `font-weight-regular` / `-strong`, `line-height-*`                 |
| Space  | `space-1` (2px) to `space-8` (48px)                                                                                           |
| Size   | `control-height`, `control-height-small`, `row-height`, `touch-height`, `sidebar-width`, `panel-width`, `drawer-width`, `content-max-width`, `logo-height` |
| Shape  | `radius-sm`, `radius-md`, `radius-lg`, `border-width`, `focus-width`, `shadow-overlay`                                        |
| Motion | `duration`, `duration-overlay`, `easing`                                                                                      |

See [`css/tokens.css`](css/tokens.css) for the full list and the default values. Controls, rows, spacing and the main columns are sized through these tokens, so changing `--spectile-control-height` resizes every button, input and tab. A few small details, such as icon sizes and some minimum widths, are fixed in `styles.css`.

### Dark mode

Colors are `light-dark()` pairs, so the reference follows the system setting. To force one, set `data-theme` on the root or any ancestor, such as `<html>`:

```tsx
<ApiReference spec={url} data-theme="dark" />
```

`data-theme="light"` forces light. Set on the reference itself, it wins over a different `data-theme` on an ancestor. To change a color in one mode only, give your override a `light-dark()` pair too.

### Touch and motion

On touch screens, rows grow to `--spectile-touch-height` (44px). With reduced motion turned on, every transition is instant. That works by setting the `duration` tokens to `0ms`, so if you set `--spectile-duration` yourself, put your value inside `@media (prefers-reduced-motion: no-preference)` to keep it.

## Server rendering

`<ApiReference>` is a client component (the package ships with `"use client"`), and you can render it straight from a Server Component: build the model on the server with `normalize` and pass it as `model`, which is plain JSON. Function props (`renderMarkdown`, `tryItOptions.fetch`, `tryItOptions.storage`) can't cross from server to client, so pass those from a `"use client"` file instead. For the same reason, `resolveLayout` and `BREAKPOINTS` can only be used in client code.

The reference measures its width when it mounts, so the server render uses the widest layout until then.
