import type { OperationGroup } from "@spectile/headless"
import { Info, Navigation, Operation, useNavigation, useSpectile } from "@spectile/react"
import { useRef } from "react"
import { useTheme } from "./context"
import { useSearchShortcut, writeOperationHash } from "./hash"
import { CloseIcon, SearchIcon } from "./icons"

export const groupLabel = ({ tag, kind }: OperationGroup) =>
  tag?.name ?? (kind === "webhook" ? "Webhooks" : "Other")

const NoResults = () => {
  const { query, setQuery } = useNavigation()
  return (
    <div className="spectile-no-results">
      <p>No operations match “{query.trim()}”</p>
      <button type="button" className="spectile-text-button" onClick={() => setQuery("")}>
        Clear search
      </button>
    </div>
  )
}

const OperationTree = ({ onSelect }: { onSelect?: () => void }) => (
  <Navigation.Tree className="spectile-nav" aria-label="Operations">
    <Navigation.Groups>
      {(group) => (
        <Navigation.Group group={group} className="spectile-nav-group" aria-label={groupLabel(group)}>
          <Navigation.GroupToggle className="spectile-nav-heading">
            {groupLabel(group)}
          </Navigation.GroupToggle>
          <Navigation.GroupItems className="spectile-nav-items">
            {group.operations.map((operation) => (
              <Navigation.Item
                key={operation.id}
                operation={operation}
                className="spectile-nav-item"
                onClick={() => {
                  writeOperationHash(operation.id)
                  onSelect?.()
                }}
              >
                <Operation.Method className="spectile-method" />
                <Navigation.Highlight
                  text={operation.summary ?? operation.path}
                  className="spectile-nav-label"
                  data-mono={operation.summary ? undefined : ""}
                />
              </Navigation.Item>
            ))}
          </Navigation.GroupItems>
        </Navigation.Group>
      )}
    </Navigation.Groups>
  </Navigation.Tree>
)

const Search = () => {
  const { searchShortcut } = useTheme()
  const { query, setQuery } = useNavigation()
  const input = useRef<HTMLInputElement>(null)
  useSearchShortcut(searchShortcut, input)
  return (
    <div className="spectile-search">
      <SearchIcon />
      <Navigation.Search
        ref={input}
        className="spectile-search-input"
        placeholder="Search"
        aria-label="Search operations"
        aria-keyshortcuts={searchShortcut ? "/" : undefined}
      />
      {query ? (
        <button
          type="button"
          className="spectile-icon-button"
          aria-label="Clear"
          onClick={() => setQuery("")}
        >
          <CloseIcon />
        </button>
      ) : (
        searchShortcut && (
          <kbd className="spectile-kbd" aria-hidden>
            /
          </kbd>
        )
      )}
    </div>
  )
}

/** Search, a live result count and the operations grouped by tag. `onSelect` runs after a pick. */
export const OperationNavigation = ({ onSelect }: { onSelect?: () => void }) => {
  const { model } = useSpectile()
  const { query, resultCount } = useNavigation()
  const searching = query.trim() !== ""
  const total = model.operations.length + model.webhooks.length
  return (
    <>
      <Search />
      <p className="spectile-result-count" role="status">
        {searching ? `${resultCount} of ${total} operations` : ""}
      </p>
      {searching && resultCount === 0 ? <NoResults /> : <OperationTree onSelect={onSelect} />}
    </>
  )
}

export const Sidebar = () => (
  <nav className="spectile-sidebar" aria-label="API reference">
    <div className="spectile-sidebar-inner">
      <div className="spectile-api-heading">
        <Info.Title className="spectile-api-title" />
        <Info.Version className="spectile-version" />
      </div>
      <OperationNavigation />
    </div>
  </nav>
)
