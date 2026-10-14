# @spectile/react

Unstyled React components and hooks for building your own API reference. You bring the markup and CSS; Spectile handles the data, state, accessibility and keyboard support.

```sh
npm install @spectile/core @spectile/headless @spectile/react
```

Requires React 19.

## Quick start

```tsx
import { normalize } from "@spectile/core";
import { Operation, SpectileProvider } from "@spectile/react";

const model = normalize(openApiDocument);

export const Docs = () => (
  <SpectileProvider model={model} defaultActiveId="listPets">
    <Operation.Root>
      <Operation.Method /> <Operation.Path />
      <h1><Operation.Summary /></h1>
      <Operation.Description />
    </Operation.Root>
  </SpectileProvider>
);
```

Need to load a spec from a URL or YAML? See `loadSpec` in `@spectile/core/loader`.

## `<SpectileProvider>`

Wrap your reference in it once. Everything below reads from it.

| Prop | |
| --- | --- |
| `model` | the `SpecModel` from `normalize` |
| `defaultActiveId` | the operation selected at first |

## Hooks

| Hook | Returns |
| --- | --- |
| `useNavigation()` | search, tag groups, the active operation, and prop getters for a sidebar |
| `useOperation(id?)` | the operation with that id, or the active one |
| `useSchemaTree(schemaRef, { defaultExpandedDepth })` | the rows and actions of a schema tree |
| `useSpectile()` | `{ model, navigation }` |

They return the headless state plus its methods, and re-render when that state changes. See `@spectile/headless` for every field.

### A sidebar with `useNavigation`

```tsx
const Sidebar = () => {
  const { groups, getSearchProps, getItemProps } = useNavigation();
  return (
    <nav>
      <input {...getSearchProps()} aria-label="Search" />
      {groups.map(({ tag, operations }) => (
        <section key={tag?.name ?? ""}>
          <h2>{tag?.name ?? "Other"}</h2>
          {operations.map((operation) => (
            <button key={operation.id} {...getItemProps(operation)}>
              {operation.summary ?? operation.path}
            </button>
          ))}
        </section>
      ))}
    </nav>
  );
};
```

Clicking an item makes it the active operation, and `<Operation.Root>` and `useOperation()` follow it.

## Components

### `Operation`

| Part | Renders |
| --- | --- |
| `Operation.Root` | a `<section>` for the active operation, or the one in its `operation` prop. Nothing when there is none. |
| `Operation.Method` | `GET`, `POST`… |
| `Operation.Path` | `/pets/{id}` |
| `Operation.Summary` | the summary |
| `Operation.Description` | the description |

For parameters, request bodies and responses, read them from `useOperation()` for now.

### `Schema`

An accessible, keyboard-navigable tree of a schema.

```tsx
<Schema.Root schema={media.schema} defaultExpandedDepth={1}>
  <Schema.Tree aria-label="Response body">
    <Schema.Rows>
      {(row) => (
        <Schema.Row row={row}>
          <Schema.Indicator>▸</Schema.Indicator>
          <Schema.Name />
          <Schema.Type />
          <Schema.Required />
          <Schema.Description />
        </Schema.Row>
      )}
    </Schema.Rows>
  </Schema.Tree>
</Schema.Root>
```

| Part | Renders |
| --- | --- |
| `Schema.Root` | no element; creates the tree state. Props: `schema`, `defaultExpandedDepth` |
| `Schema.Tree` | `<div role="tree">` |
| `Schema.Rows` | calls its child function once per visible row |
| `Schema.Row` | `<div role="treeitem">`, clickable, with keyboard support |
| `Schema.Name` | the property name |
| `Schema.Type` | `string`, `Pet`, `Pet[]`, `string \| null`… |
| `Schema.Required` | `required`, only when it is |
| `Schema.Description` | the description, when there is one |
| `Schema.Indicator` | your expand icon, only on expandable rows |

Inside a row, `useSchemaRow()` gives you the row (with its full `node`) for anything custom, such as constraints or enums. Inside a root, `useSchema()` gives you the whole tree state, including `expandAll()` and `collapseAll()`.

## Styling

Components render no styles. They describe their state with attributes you can target in CSS:

| Attribute | On | Values |
| --- | --- | --- |
| `data-state` | `Schema.Row`, `Schema.Indicator` | `open`, `closed` |
| `data-state` | navigation items | `active`, `inactive` |
| `data-method` | operation parts, navigation items | `get`, `post`… |
| `data-kind` | `Schema.Row` | `property`, `items`, `oneOf`… |
| `data-required`, `data-deprecated`, `data-recursive` | rows, operations | present when true |
| `--spectile-depth` | `Schema.Row` | nesting level, `0` at the top |

```css
.row { padding-left: calc(var(--spectile-depth) * 1rem); }
.row[data-deprecated] { text-decoration: line-through; }
.indicator[data-state="open"] { rotate: 90deg; }
[data-method="delete"] { color: crimson; }
```

## Customizing

**Your props win.** `className` is added to ours, `style` is merged, and your event handlers run before ours. Call `event.preventDefault()` to stop ours:

```tsx
<Schema.Row row={row} onClick={(event) => event.preventDefault()} />
```

**Text parts take children** to replace the default text:

```tsx
<Schema.Required>*</Schema.Required>
```

**`asChild` renders your element** instead of ours, with all our props and behavior merged onto it:

```tsx
<Operation.Root asChild>
  <article className="card">…</article>
</Operation.Root>
```

## Server rendering

The package ships with `"use client"`, so it works inside React Server Components apps. Build the model on the server and pass it down; it's plain JSON.
