import type { NormalizedOperation, SpecModel } from "@spectile/core"
import { type OperationGroup, firstGroupOf, itemKey } from "@spectile/headless"
import { Info, Navigation, Operation, useOperationContext, useSpectile } from "@spectile/react"
import { useCallback, useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { DocsLink, SectionLevelProvider, Tag } from "./bits"
import { useTheme } from "./context"
import { hashOperationId, useHashNavigation, writeOperationHash } from "./hash"
import { ChevronIcon } from "./icons"
import { OperationPath, RequestDetails } from "./operation"
import { OperationUiProvider } from "./operation-state"
import { EmptyPanel, Panel, TryItButton, TryItPlacement } from "./placements"
import { Collapse } from "./presence"
import { Responses } from "./responses"
import { Search, SearchResultCount, SearchResults, groupLabel } from "./search"

/**
 * Open rows by `itemKey`, so an operation listed under two tags is two rows. Most recently used
 * last; the last one is the one the panel shows.
 */
type OpenRows = ReadonlySet<string>

const toggled = (rows: OpenRows, key: string): OpenRows => {
  const next = new Set(rows)
  if (!next.delete(key)) next.add(key)
  return next
}

const raised = (rows: OpenRows, key: string): OpenRows => {
  if ([...rows].at(-1) === key) return rows
  const next = new Set(rows)
  next.delete(key)
  return next.add(key)
}

/** A deep link opens the first listing of its operation. */
const firstRowKey = (model: SpecModel, id: string) => {
  const group = firstGroupOf(model, id)
  const operation = group?.operations.find((candidate) => candidate.id === id)
  return group && operation && itemKey(group, operation)
}

/** A new object per deep link, so following the same one again scrolls again. */
type Target = { key: string }

type RowState = {
  open: OpenRows
  active?: string
  /** The row a deep link named; it scrolls into view. */
  target?: Target
  toggle: (key: string, id: string) => void
  activate: (key: string) => void
  /** Where the active row renders its panel. */
  panelSlot: HTMLElement | null
}

/** Description and Try it, then the request beside the responses when there is room. */
const OperationBody = ({ id }: { id: string }) => {
  const { responses, externalDocs } = useOperationContext()
  return (
    <div id={id} className="spectile-stacked-body">
      <div className="spectile-stacked-intro">
        <Operation.Description className="spectile-description spectile-prose" />
        <TryItButton />
      </div>
      <DocsLink externalDocs={externalDocs} />
      <div className="spectile-stacked-columns">
        <div className="spectile-stacked-column">
          <RequestDetails />
        </div>
        <div className="spectile-stacked-column">
          <Responses responses={responses} />
        </div>
      </div>
      <TryItPlacement />
    </div>
  )
}

const OperationRow = ({
  operation,
  rowKey,
  open,
  active,
  target,
  toggle,
  activate,
  panelSlot,
}: { operation: NormalizedOperation; rowKey: string } & RowState) => {
  const isOpen = open.has(rowKey)
  const isActive = active === rowKey
  const scrollTarget = target?.key === rowKey ? target : undefined
  const id = useId()
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    if (scrollTarget) ref.current?.scrollIntoView?.({ block: "start" })
  }, [scrollTarget])
  const onUse = isOpen ? () => activate(rowKey) : undefined
  return (
    <Operation.Root
      ref={ref}
      operation={operation}
      className="spectile-stacked-row"
      data-state={isOpen ? "open" : "closed"}
      data-active={isActive && panelSlot ? "" : undefined}
      onFocus={onUse}
      onPointerDown={onUse}
    >
      <h3 className="spectile-stacked-heading">
        <button
          type="button"
          className="spectile-stacked-toggle"
          aria-expanded={isOpen}
          aria-controls={isOpen ? id : undefined}
          onClick={() => toggle(rowKey, operation.id)}
        >
          <Operation.Method className="spectile-method" />
          <span className="spectile-stacked-label">
            {isOpen ? (
              <OperationPath />
            ) : (
              <Navigation.Highlight text={operation.path} className="spectile-path" />
            )}
            {operation.summary && (
              <Navigation.Highlight text={operation.summary} className="spectile-stacked-summary" />
            )}
          </span>
          {operation.deprecated && <Tag tone="deprecated">deprecated</Tag>}
          <ChevronIcon />
        </button>
      </h3>
      <Collapse open={isOpen}>
        <OperationUiProvider operation={operation}>
          <SectionLevelProvider value={4}>
            <OperationBody id={id} />
          </SectionLevelProvider>
          {isActive && panelSlot && createPortal(<Panel />, panelSlot)}
        </OperationUiProvider>
      </Collapse>
    </Operation.Root>
  )
}

const GroupSection = ({ group, ...rows }: { group: OperationGroup } & RowState) => (
  <Navigation.Group group={group} className="spectile-stacked-group">
    <h2 className="spectile-group-title">{groupLabel(group)}</h2>
    <Navigation.GroupDescription className="spectile-description spectile-prose" />
    <DocsLink externalDocs={group.tag?.externalDocs} />
    <div className="spectile-stacked-list">
      {group.operations.map((operation) => (
        <OperationRow
          key={operation.id}
          operation={operation}
          rowKey={itemKey(group, operation)}
          {...rows}
        />
      ))}
    </div>
  </Navigation.Group>
)

const Heading = () => {
  const { model } = useSpectile()
  const server = model.servers[0]?.url
  return (
    <header className="spectile-stacked-header">
      <div>
        <h1 className="spectile-stacked-title">
          <Info.Title />
        </h1>
        <p className="spectile-version">
          <Info.Version />
          {server && ` · ${server}`}
        </p>
      </div>
      <Search placeholder="Filter operations" />
    </header>
  )
}

/**
 * Every operation in one column, grouped by tag; rows open in place and several can be open. The
 * panel, when there is one, shows the open row used last.
 */
export const StackedReference = () => {
  const { model } = useSpectile()
  const hasPanel = useTheme().tryIt === "panel"
  const [panelSlot, setPanelSlot] = useState<HTMLElement | null>(null)
  const [target, setTarget] = useState<Target | undefined>(() => {
    const id = hashOperationId(model)
    const key = id && firstRowKey(model, id)
    return key ? { key } : undefined
  })
  const [open, setOpen] = useState<OpenRows>(() => new Set(target ? [target.key] : []))
  const navigate = useCallback(
    (id: string) => {
      const key = firstRowKey(model, id)
      if (!key) return
      setOpen((rows) => raised(rows, key))
      setTarget({ key })
    },
    [model],
  )
  useHashNavigation(navigate)
  const toggle = (key: string, id: string) => {
    if (!open.has(key)) writeOperationHash(id)
    setOpen(toggled(open, key))
  }
  const activate = (key: string) => setOpen((rows) => raised(rows, key))
  const active = [...open].at(-1)
  const rows = { open, active, target, toggle, activate, panelSlot: hasPanel ? panelSlot : null }
  return (
    <div className="spectile-stacked-page">
      <div className="spectile-stacked">
        <Heading />
        <SearchResultCount />
        <SearchResults>
          <Navigation.Groups>{(group) => <GroupSection group={group} {...rows} />}</Navigation.Groups>
        </SearchResults>
      </div>
      {hasPanel && (
        <div ref={setPanelSlot} className="spectile-panel-slot">
          {!active && <EmptyPanel />}
        </div>
      )}
    </div>
  )
}
