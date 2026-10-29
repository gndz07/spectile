import { type Issue, type SpecModel, findOperation } from "@spectile/core"
import { type TryItOptions, parseOperationHash } from "@spectile/headless"
import { type RenderMarkdown, SpectileProvider, useComposedRefs } from "@spectile/react"
import { type ComponentPropsWithRef, useRef } from "react"
import { type ThemeSettings, ThemeProvider } from "./context"
import { type Layout, type TryItPreference, resolveLayout } from "./layout"
import { defaultRenderMarkdown } from "./markdown"
import { Reference } from "./reference"
import { LoadFailed, Loading, NoOperations, Warnings } from "./states"
import { type SpecInput, useSpec } from "./use-spec"
import { useWidth } from "./use-width"

type Options = {
  /** `sidebar` (default) shows one operation at a time; `stacked` lists them all in one column. */
  layout?: Layout
  /** Where the request form goes; a preference the width can override. `false` hides it. */
  tryIt?: TryItPreference
  tryItOptions?: TryItOptions
  /** `/` focuses search. On by default in the sidebar layout. */
  searchShortcut?: boolean
  /** Defaults to react-markdown, which skips raw HTML. */
  renderMarkdown?: RenderMarkdown
}

type Source =
  | {
      /** A URL or a parsed document; loaded with `@spectile/core/loader`, imported on demand. */
      spec: SpecInput
      model?: never
    }
  | { model: SpecModel; spec?: never }

export type ApiReferenceProps = Options & Source & Omit<ComponentPropsWithRef<"div">, "children">

type ContentOptions = Pick<Options, "tryItOptions" | "renderMarkdown">

type ReadyProps = ContentOptions & { model: SpecModel; warnings?: Issue[] }

const initialOperation = (model: SpecModel) => {
  const fromHash =
    typeof window === "undefined" ? undefined : parseOperationHash(window.location.hash)
  return findOperation(model, fromHash)?.id ?? model.operations[0]?.id ?? model.webhooks[0]?.id
}

const Ready = ({ model, warnings = [], tryItOptions, renderMarkdown }: ReadyProps) => (
  <SpectileProvider
    model={model}
    defaultActiveId={initialOperation(model)}
    tryItOptions={tryItOptions}
    renderMarkdown={renderMarkdown}
  >
    {warnings.length > 0 && <Warnings warnings={warnings} />}
    {model.operations.length + model.webhooks.length > 0 ? <Reference /> : <NoOperations />}
  </SpectileProvider>
)

const Loaded = ({ spec, ...props }: ContentOptions & { spec: SpecInput }) => {
  const state = useSpec(spec)
  if (state.status === "loading") return <Loading />
  if (state.status === "failed") return <LoadFailed error={state.error} retry={state.retry} />
  return <Ready model={state.model} warnings={state.warnings} {...props} />
}

/** A complete, styled API reference. Import `@spectile/theme/styles.css` once alongside it. */
export const ApiReference = ({
  spec,
  model,
  layout = "sidebar",
  tryIt = "panel",
  tryItOptions,
  searchShortcut = layout === "sidebar",
  renderMarkdown = defaultRenderMarkdown,
  className,
  ref,
  ...props
}: ApiReferenceProps) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const composedRef = useComposedRefs(ref, rootRef)
  const resolved = resolveLayout({ layout, tryIt, width: useWidth(rootRef) })
  const settings: ThemeSettings = { ...resolved, preference: { tryIt }, searchShortcut }
  const content: ContentOptions = { tryItOptions, renderMarkdown }
  return (
    <div
      {...props}
      ref={composedRef}
      className={className ? `spectile ${className}` : "spectile"}
      data-layout={resolved.layout}
      data-navigation={resolved.navigation}
      data-try-it={resolved.tryIt || "off"}
    >
      <ThemeProvider value={settings}>
        {model ? (
          <Ready model={model} {...content} />
        ) : (
          spec !== undefined && <Loaded spec={spec} {...content} />
        )}
      </ThemeProvider>
    </div>
  )
}
