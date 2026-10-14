# @spectile/headless

The behavior behind an API reference (search, navigation, expandable schema trees, keyboard support), without any rendering. Works with any framework or none.

```sh
npm install @spectile/core @spectile/headless
```

If you use React, you probably want `@spectile/react`, which wraps everything here.

## How it works

Every feature is a small **store**:

- `getSnapshot()` returns the current state.
- `subscribe(listener)` calls you when it changes, and returns an unsubscribe function.
- Methods like `toggle(id)` or `setQuery(text)` change it.

Stores also give you **prop getters**, such as `getRowProps(row)`. They return plain objects with the right ARIA attributes, `data-*` attributes and event handlers. Spread them onto your elements and accessibility and keyboard support just work.

Snapshots only change when something actually changed, so they plug straight into React's `useSyncExternalStore`, Vue's `shallowRef`, Svelte stores and so on.

## Navigation

The list of operations: search, grouping by tag, and the selected operation.

```ts
import { createNavigation } from "@spectile/headless";

const nav = createNavigation(model, { activeId: "listPets" });

nav.setQuery("get pets");
const { groups, resultCount, active } = nav.getSnapshot();
```

- **Search** matches method, path, operationId, summary and tags. Every word must match.
- **`groups`**: `[{ tag, operations }]` in the spec's tag order. Untagged operations come last with no `tag`. Empty groups are left out.
- **`active`**: the selected operation.

Prop getters:

```ts
nav.getSearchProps();         // { type: "search", value, onChange }
nav.getItemProps(operation);  // { "aria-current", "data-state": "active" | "inactive", "data-method", onClick }
```

## Schema tree

An expandable tree of a schema's properties, following the WAI-ARIA tree pattern.

```ts
import { createSchemaTree } from "@spectile/headless";

// any SchemaRef from the model, e.g. a response's media.schema
const tree = createSchemaTree(model, schemaRef, { defaultExpandedDepth: 1 });

const { root, rows } = tree.getSnapshot();
```

`rows` is a flat list of the visible rows, ready to render in order. Use `depth` to indent. Each row has:

- `id`, `parentId`, `depth`
- `kind`: `property`, `items`, `additionalProperties`, `allOf`, `oneOf`, `anyOf` or `not`
- `name`, `required`
- `node`: the full `SchemaNode` (types, description, constraints…)
- `expandable`, `expanded`
- `recursive`: this schema already appears above this row. "Expand all" stops here, so circular schemas don't expand forever; you can still open them by hand.

Actions: `expand(id)`, `collapse(id)`, `toggle(id)`, `expandAll()`, `collapseAll()`, `focus(id)`.

Prop getters:

```ts
tree.getTreeProps();     // { role: "tree" }
tree.getRowProps(row);   // role, aria-level, aria-expanded, tabIndex, data-state, data-depth, data-kind,
                         // data-required, data-recursive, data-deprecated, onKeyDown, onClick, onFocus
```

**Keyboard support:**

| Key | Action |
| --- | --- |
| ↓ / ↑ | next / previous row |
| → | expand, or move to the first child |
| ← | collapse, or move to the parent |
| Home / End | first / last row |
| Enter / Space | toggle |

Only one row is in the tab order (`tabStopId`). The snapshot's `focusedId` tells you which row should have DOM focus. Moving that focus is up to you.

## Labels

Pure helpers so every framework shows the same text:

```ts
schemaTypeLabel(node); // "Pet", "Pet[]", "string | null", "oneOf", "any"
schemaRowLabel(row);   // property name, else title, else schema name, else "oneOf[0]"
```

## Building your own store

The store tools are exported if you want to add features in the same style:

```ts
import { createStore, select } from "@spectile/headless";

const store = createStore({ open: false });
store.setState({ open: true });                       // merge; no-op if nothing changed
store.setState((state) => ({ ...state, open: !state.open }));

const label = select(store, (state) => (state.open ? "Hide" : "Show")); // derived, cached
```
