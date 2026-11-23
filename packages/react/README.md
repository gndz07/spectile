# @spectile/react

Unstyled React components and hooks for building your own API reference. You bring the markup and CSS; Spectile handles the data, state, accessibility and keyboard support.

```sh
npm install @spectile/core @spectile/headless @spectile/react
```

Requires React 19.

## Quick start

```tsx
import { normalize } from "@spectile/core"
import { Operation, SpectileProvider } from "@spectile/react"

const model = normalize(openApiDocument)

export const Docs = () => (
  <SpectileProvider model={model} defaultActiveId="listPets">
    <Operation.Root>
      <Operation.Method /> <Operation.Path />
      <h1>
        <Operation.Summary />
      </h1>
      <Operation.Description />
    </Operation.Root>
  </SpectileProvider>
)
```

Need to load a spec from a URL or YAML? See `loadSpec` in `@spectile/core/loader`. Want a finished, styled reference instead? See [`@spectile/theme`](../theme), which is built from these components.

## `<SpectileProvider>`

Wrap your reference in it once. Everything below reads from it.

| Prop              |                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------- |
| `model`           | the `SpecModel` from `normalize`                                                       |
| `defaultActiveId` | the operation selected at first                                                        |
| `tryItOptions`    | `{ fetch, baseUrl, storage, storageKey }`; see `createTryIt` in `@spectile/headless`   |
| `renderMarkdown`  | `(markdown) => ReactNode`, turns descriptions into elements; see [Markdown](#markdown) |

## Hooks

| Hook                                                 | Returns                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------ |
| `useNavigation()`                                    | search, tag groups, the active operation, and prop getters for a sidebar |
| `useOperation(id?)`                                  | the operation with that id, or the active one                            |
| `useSchemaTree(schemaRef, { defaultExpandedDepth, usage, recursion })` | the rows and actions of a schema tree                                    |
| `useTryIt(operationId)`                              | the draft, request, result and actions for trying an operation           |
| `useTryItSettings()`                                 | the credentials shared by every operation                                |
| `useSpectile()`                                      | `{ model, navigation, tryIt }`                                           |

They return the headless state plus its methods, and re-render when that state changes. See `@spectile/headless` for every field.

## Components

### `Info`

The API's `Info.Title`, `Info.Version`, `Info.Summary` and `Info.Description` (a `<div>`, as [Markdown](#markdown)). They work anywhere in the provider.

### `Navigation`

A sidebar with search, tag groups and the active operation.

```tsx
<nav>
  <Navigation.Search aria-label="Search" />
  <Navigation.Groups>
    {(group) => (
      <Navigation.Group group={group}>
        <h2>{group.tag ? <Navigation.GroupName /> : "Other"}</h2>
        <Navigation.GroupDescription />
        {group.operations.map((operation) => (
          <Navigation.Item key={operation.id} operation={operation}>
            <Operation.Method /> <Operation.Summary />
          </Navigation.Item>
        ))}
      </Navigation.Group>
    )}
  </Navigation.Groups>
</nav>
```

| Part                          | Renders                                                                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `Navigation.Search`           | an `<input type="search">` that filters the operations                                                                                    |
| `Navigation.Groups`           | calls its child function once per tag with matching operations, then for untagged ones, then for webhooks                                |
| `Navigation.Group`            | a `<div>` for one group (prop `group`)                                                                                                    |
| `Navigation.GroupName`        | the tag's name. Nothing for untagged operations and webhooks.                                                                             |
| `Navigation.GroupDescription` | a `<div>` with the tag's description, as [Markdown](#markdown)                                                                            |
| `Navigation.Item`             | a `<button>` that makes its `operation` active, with `aria-current="page"` when it is. `Operation.*` parts inside it show that operation. |
| `Navigation.ResultCount`      | the number of matching operations, announced as it changes (`role="status"`)                                                              |
| `Navigation.Highlight`        | its `text` prop, with each match of the search in a `<mark>`                                                                              |

Clicking an item makes it the active operation, and `<Operation.Root>` and `useOperation()` follow it. For anything else, use `useNavigation()`.

**Keyboard tree.** Wrap the groups in `Navigation.Tree` to make them one WAI-ARIA tree: arrows move between groups and items, Left and Right close and open groups, Home and End jump. Groups then fold:

```tsx
<Navigation.Tree aria-label="Operations">
  <Navigation.Groups>
    {(group) => (
      <Navigation.Group group={group}>
        <Navigation.GroupToggle>
          <Navigation.GroupName />
        </Navigation.GroupToggle>
        <Navigation.GroupItems>
          {group.operations.map((operation) => (
            <Navigation.Item key={operation.id} operation={operation}>
              <Operation.Method /> <Navigation.Highlight text={operation.summary ?? operation.path} />
            </Navigation.Item>
          ))}
        </Navigation.GroupItems>
      </Navigation.Group>
    )}
  </Navigation.Groups>
</Navigation.Tree>
```

| Part                     | Renders                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| `Navigation.Tree`        | `<div role="tree">`; inside it, `Group` and `Item` become tree items with a single tab stop           |
| `Navigation.GroupToggle` | a `<div>` that opens or closes its group when clicked                                                 |
| `Navigation.GroupItems`  | `<div role="group">` holding the items; nothing while the group is closed, unless `forceMount` (to animate it closing) |

`Navigation.useGroupOpen()` tells you whether the enclosing group is open. Every group opens while a search is active. Without `Navigation.Tree`, items stay plain buttons.

### `Operation`

| Part                    | Renders                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `Operation.Root`        | a `<section>` for the active operation, or the one in its `operation` prop. Nothing when there is none. |
| `Operation.Method`      | `GET`, `POST`…                                                                                          |
| `Operation.Path`        | `/pets/{id}`, or a webhook's name                                                                       |
| `Operation.Summary`     | the summary                                                                                             |
| `Operation.Description` | a `<div>` with the description, as [Markdown](#markdown)                                                |

### `Parameter`, `RequestBody` and `Response`

```tsx
<Operation.Root>
  {operation.parameters.map((parameter) => (
    <Parameter.Root key={`${parameter.in}:${parameter.name}`} parameter={parameter}>
      <Parameter.Name /> <Parameter.Location /> <Parameter.Type /> <Parameter.Required />
      <Parameter.Description />
    </Parameter.Root>
  ))}

  <RequestBody.Root>
    <h2>
      Request body <RequestBody.Required />
    </h2>
    <RequestBody.Description />
  </RequestBody.Root>

  {operation.responses.map((response) => (
    <Response.Root key={response.status} response={response}>
      <Response.Status /> <Response.Description />
      {response.headers.map((header) => (
        <Parameter.Root key={header.name} parameter={header}>
          …
        </Parameter.Root>
      ))}
    </Response.Root>
  ))}
</Operation.Root>
```

| Part                      | Renders                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| `Parameter.Root`          | a `<div>` for one parameter or response header (prop `parameter`)                                         |
| `Parameter.Name`          | the name                                                                                                  |
| `Parameter.Location`      | `query`, `header`, `path` or `cookie`. Nothing for a response header.                                     |
| `Parameter.Type`          | `string`, `Pet[]`…                                                                                        |
| `Parameter.Required`      | `required`, only when it is                                                                               |
| `Parameter.Description`   | a `<div>` with the description, as [Markdown](#markdown)                                                  |
| `RequestBody.Root`        | a `<div>` for the operation's request body. Nothing when it takes none. Place it inside `Operation.Root`. |
| `RequestBody.Required`    | `required`, only when it is                                                                               |
| `RequestBody.Description` | a `<div>` with the description, as [Markdown](#markdown)                                                  |
| `RequestBody.MediaSelect` | a `<select>` of content types when the body has several; nothing otherwise. The choice is shared with the operation's try-it form, and `useRequestBodyMedia()` returns it. |
| `Response.Root`           | a `<div>` for one response (prop `response`)                                                              |
| `Response.Status`         | `200`, `4XX` or `default`                                                                                 |
| `Response.Description`    | a `<div>` with the description, as [Markdown](#markdown)                                                  |

For the body and response schemas, pass each `content[].schema` to [`Schema`](#schema). Inside a root, `useParameter()`, `useRequestBody()` and `useResponse()` give you the whole object.

### `ExternalDocs`

A "read more" link. Pass the `externalDocs` of the model, a tag, an operation or a schema:

```tsx
<ExternalDocs.Root externalDocs={operation.externalDocs}>
  <ExternalDocs.Description />
  <ExternalDocs.Link>Read more</ExternalDocs.Link>
</ExternalDocs.Root>
```

| Part                       | Renders                                                          |
| -------------------------- | ---------------------------------------------------------------- |
| `ExternalDocs.Root`        | a `<div>`. Nothing when `externalDocs` is undefined.             |
| `ExternalDocs.Link`        | an `<a href>` to the docs, showing the URL unless given children |
| `ExternalDocs.Description` | a `<div>` with the description, as [Markdown](#markdown)         |

### `Markdown`

Descriptions in OpenAPI are Markdown. Spectile doesn't include a Markdown parser, so you can use the one you already have and decide how to handle raw HTML. Pass it to the provider:

```tsx
import ReactMarkdown from "react-markdown";

<SpectileProvider model={model} renderMarkdown={(markdown) => <ReactMarkdown>{markdown}</ReactMarkdown>}>
```

Every `Description` part and `<Markdown>` then use it. Without it, they show the text as is. Use `<Markdown>` for any other description:

```tsx
<Markdown source={example.description} />
```

It renders a `<div>`, and nothing when `source` is empty.

> Specs can come from anywhere. If your renderer allows raw HTML, sanitize it.

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

| Part                 | Renders                                                                     |
| -------------------- | --------------------------------------------------------------------------- |
| `Schema.Root`        | no element; creates the tree state. Props: `schema`, `defaultExpandedDepth`, `usage`, `recursion` |
| `Schema.Tree`        | `<div role="tree">`                                                         |
| `Schema.Rows`        | calls its child function once per visible row                               |
| `Schema.Row`         | `<div role="treeitem">`, clickable, with keyboard support                   |
| `Schema.Name`        | the property name                                                           |
| `Schema.Type`        | `string`, `Pet`, `Pet[]`, `string \| null`…                                 |
| `Schema.Required`    | `required`, only when it is                                                 |
| `Schema.Description` | a `<div>` with the description as [Markdown](#markdown), when there is one  |
| `Schema.Indicator`   | your expand icon, only on expandable rows                                   |
| `Schema.Default`     | the default after the type, e.g. `= true`                                   |
| `Schema.Constraints` | limits, e.g. `≥ 1 · ≤ 100`                                                  |
| `Schema.VariantSelect` | on a oneOf/anyOf row, a `<select>` of its variants; the chosen one's fields show under the row. Its own tab stop, so arrow keys never change it. |
| `Schema.Link`        | on a recursive row that doesn't expand, a `<button>` that moves focus to the ancestor row with the same schema |
| `Schema.ExpandToggle` | a `<button>`: "Expand all", then "Collapse all" once every row is open. Place it inside `Schema.Root`. |

`Schema.Root` takes the `useSchemaTree` options: `usage="request"` leaves out readOnly properties (`"response"` leaves out writeOnly ones), and `recursion="link"` keeps recursive rows from expanding at all. See [`@spectile/headless`](../headless#schema-tree).

Inside a row, `useSchemaRow()` gives you the row (with its full `node`) for anything custom, such as allowed values (`schemaAllowedValues` in headless). Inside a root, `useSchema()` gives you the whole tree state, including `hiddenNames`, `expandAll()` and `collapseAll()`.

### `Example`

A media type's examples, with a picker when there are several.

```tsx
<Example.Root media={response.content[0]}>
  <Example.Select aria-label="Example" />
  <Example.Summary />
  <Example.Description />
  <pre>
    <Example.Value />
  </pre>
</Example.Root>
```

| Part                  | Renders                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| `Example.Root`        | a `<div>`. Uses the media type's named examples, or builds one from its schema when it has none. Nothing when it has neither. Pass `usage` to build a request or response example. |
| `Example.Select`      | a `<select>` of the examples, by summary or name; nothing when there's only one                       |
| `Example.Summary`     | the chosen example's summary                                                                          |
| `Example.Description` | a `<div>` with its description, as [Markdown](#markdown)                                              |
| `Example.Value`       | its value as text (JSON indented), or the URL of an `externalValue`                                   |

`useExample()` gives you the chosen example and its `text`, for example to hand to `Json.Root` or `Copy`.

### `Json`

A JSON viewer with foldable objects and arrays and tokens to color.

```tsx
<Json.Root text={body} foldDepth={1}>
  <Json.Lines>
    {(line) => (
      <Json.Line line={line} className="line">
        <Json.Toggle>▾</Json.Toggle>
        <Json.Tokens />
      </Json.Line>
    )}
  </Json.Lines>
</Json.Root>
```

| Part          | Renders                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| `Json.Root`   | a `<div>`. Text that isn't JSON shows as plain lines. `foldDepth` starts nested objects, and arrays of objects or arrays, folded from that depth; `1` keeps the top level open. |
| `Json.Lines`  | calls its child function once per visible line                                                             |
| `Json.Line`   | a `<div>` with `--spectile-depth` for indenting, and `data-state` on lines that open a fold                |
| `Json.Toggle` | a `<button>` that folds the object or array opening on this line; nothing on other lines                   |
| `Json.Tokens` | the line's tokens as `<span data-kind>`: `key`, `string`, `number`, `boolean`, `null`, `punctuation`, `ellipsis` or `text` |

Every new body starts folded from `foldDepth`. What the reader opened or closed is kept by path, so it survives a new body of the same shape. For custom tokens, `useJsonLine()` gives you the line, including `fold.size` (the folded entries) for labels like "3 items".

### `Copy`

```tsx
<Copy text={curl}>Copy</Copy>
```

A `<button>` that copies `text` to the clipboard. `data-state` is `copied` for two seconds after (`resetAfter` changes that), or `failed`.

### `TryIt`

Send real requests from the docs. Place it inside `Operation.Root`.

```tsx
<Operation.Root>
  <TryIt.Credential scheme="apiKey" type="password" />

  <TryIt.Root>
    <TryIt.ServerSelect />
    <TryIt.ServerVariable name="region" />
    <TryIt.Server />

    {operation.parameters.map((parameter) => (
      <label key={`${parameter.in}.${parameter.name}`}>
        {parameter.name} <TryIt.Parameter parameter={parameter} />
      </label>
    ))}
    <BodyFields />
    <TryIt.Body />
    <TryIt.Send>Send</TryIt.Send>

    <TryIt.Curl asChild>
      <pre />
    </TryIt.Curl>
    <TryIt.Error />
    <TryIt.Status />
    <TryIt.ResponseBody asChild>
      <pre />
    </TryIt.ResponseBody>
  </TryIt.Root>
</Operation.Root>
```

| Part                   | Renders                                                                                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TryIt.Root`           | a `<form>`; submitting it sends the request                                                                                                                                 |
| `TryIt.Parameter`      | an `<input>` for one parameter (prop `parameter`), pre-filled from examples                                                                                                 |
| `TryIt.Body`           | a `<textarea>` with an example body. Nothing when the operation takes no body, or when the body is filled in with `TryIt.Field`s.                                          |
| `TryIt.Field`          | an `<input>` for one property of a form or multipart body (prop `field`): `type="file"` with `accept` and `multiple` for files, else text pre-filled from examples          |
| `TryIt.Send`           | a submit `<button>`, disabled while sending                                                                                                                                 |
| `TryIt.Cancel`         | a `<button>` that stops the request; only while one is pending                                                                                                              |
| `TryIt.Status`         | `200 OK`, once a response arrives (`aria-live="polite"`)                                                                                                                    |
| `TryIt.Duration`       | how long it took, e.g. `85 ms`                                                                                                                                              |
| `TryIt.Size`           | the body's size, e.g. `1.5 KB`                                                                                                                                              |
| `TryIt.ResponseBody`   | the response body, pretty-printed when it's JSON                                                                                                                            |
| `TryIt.Error`          | why the request failed (`role="alert"`), with `data-network` when no response came back                                                                                    |
| `TryIt.Curl`           | the request as a curl command, updated as you type. Required values still empty show as `{name}` in a `<span data-missing>`.                                               |
| `TryIt.ServerSelect`   | a `<select>` with one `<option>` per server (its description, else its URL). Nothing when the operation has one server.                                                     |
| `TryIt.ServerVariable` | for one server variable (prop `name`): a `<select>` when it lists its values, else an `<input>`. Nothing when the chosen server has no such variable.                       |
| `TryIt.Server`         | an `<input>` with the resulting base URL. Typing in it overrides the server.                                                                                                |
| `TryIt.Credential`     | an `<input>` for a security scheme's token or key (prop `scheme`). For HTTP Basic, use two, with `field="username"` and `field="password"`. Works anywhere in the provider. |
| `TryIt.CredentialDescription` | a `<div>` with the security scheme's description (prop `scheme`), as [Markdown](#markdown)                                                                           |

To show every variable of the chosen server, map over `useTryItContext().serverVariables`:

```tsx
{
  Object.keys(useTryItContext().serverVariables).map((name) => (
    <label key={name}>
      {name} <TryIt.ServerVariable name={name} />
    </label>
  ))
}
```

Form and multipart bodies are filled in one field per property. Map over `useTryItContext().bodyFields` (empty for other bodies):

```tsx
const BodyFields = () =>
  useTryItContext().bodyFields.map((field) => (
    <label key={field.name}>
      {field.name} <TryIt.Field field={field} />
    </label>
  ))
```

Credentials are shared by every operation. The chosen server is shared by operations with the same server list, so an endpoint with its own servers keeps its own choice. What's typed into an operation's form is kept when you switch to another one and back. Required parameters get the `required` attribute, so the browser asks for them before sending.

Calls to another site's API only work if that API allows browser requests (CORS). If it doesn't, pass a `fetch` that goes through your own proxy: `<SpectileProvider tryItOptions={{ fetch: proxyFetch }}>`.

## Styling

Components render no styles. They describe their state with attributes you can target in CSS:

| Attribute                                            | On                                           | Values                              |
| ---------------------------------------------------- | -------------------------------------------- | ----------------------------------- |
| `data-state`                                         | `Schema.Row`, `Schema.Indicator`             | `open`, `closed`                    |
| `data-state`                                         | navigation items                             | `active`, `inactive`                |
| `data-method`                                        | operation parts, navigation items            | `get`, `post`…                      |
| `data-kind`                                          | `Schema.Row`                                 | `property`, `items`, `oneOf`…       |
| `data-kind`                                          | `Operation.Root`, `Navigation.Group`         | `operation`, `webhook`              |
| `data-required`, `data-deprecated`, `data-recursive` | rows, operations, parameters, request bodies | present when true                   |
| `data-location`                                      | `Parameter.Root`                             | `query`, `header`, `path`, `cookie` |
| `data-status`                                        | `Response.Root`                              | the status, e.g. `200`              |
| `data-state`                                         | `TryIt.Root`                                 | `idle`, `pending`, `done`, `error`  |
| `data-status`, `data-ok`                             | `TryIt.Status`                               | the HTTP status; `data-ok` for 2xx  |
| `data-missing`                                       | spans inside `TryIt.Curl`                    | present on unfilled placeholders    |
| `data-network`                                       | `TryIt.Error`                                | present when no response came back  |
| `data-state`                                         | groups in `Navigation.Tree`, `GroupItems`, `Json.Line`, `Json.Toggle`, `Schema.ExpandToggle` | `open`, `closed` |
| `data-state`                                         | `Copy`                                       | `idle`, `copied`, `failed`          |
| `data-kind`                                          | spans from `Json.Tokens`                     | `key`, `string`, `number`…          |
| `--spectile-depth`                                   | `Schema.Row`, `Json.Line`                    | nesting level, `0` at the top       |

```css
.row {
  padding-left: calc(var(--spectile-depth) * 1rem);
}
.row[data-deprecated] {
  text-decoration: line-through;
}
.indicator[data-state="open"] {
  rotate: 90deg;
}
[data-method="delete"] {
  color: crimson;
}
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

On a text part, an empty child gets the default text. This renders `<a href="#listPets">/pets</a>`:

```tsx
<Operation.Path asChild>
  <a href={`#${operation.id}`} />
</Operation.Path>
```

## Server rendering

The package ships with `"use client"`, so it works inside React Server Components apps. Build the model on the server and pass it down; it's plain JSON.
