import type { OperationGroup } from "@spectile/headless"
import { Navigation, useNavigation, useSpectile } from "@spectile/react"
import { type ReactNode, useCallback, useRef } from "react"
import { useTheme } from "./context"
import { useSearchShortcut } from "./hash"
import { CloseIcon, SearchIcon } from "./icons"

/** `users` reads "Users"; names with capitals of their own, like `iOS`, stay as written. */
const displayTagName = (name: string) =>
  /^[a-z][^A-Z]*$/.test(name) ? name.charAt(0).toUpperCase() + name.slice(1) : name

export const groupLabel = ({ tag, kind }: OperationGroup) =>
  tag ? displayTagName(tag.name) : kind === "webhook" ? "Webhooks" : "Other"

const isSearching = (query: string) => query.trim() !== ""

/** `autoFocus` focuses the field when the dialog around it opens. */
export const Search = ({ placeholder, autoFocus }: { placeholder: string; autoFocus?: boolean }) => {
  const { searchShortcut } = useTheme()
  const { query, setQuery } = useNavigation()
  const input = useRef<HTMLInputElement>(null)
  useSearchShortcut(
    searchShortcut,
    useCallback(() => input.current?.focus(), []),
  )
  return (
    <div className="spectile-search">
      <SearchIcon />
      <Navigation.Search
        ref={input}
        className="spectile-search-input"
        placeholder={placeholder}
        aria-label="Search operations"
        aria-keyshortcuts={searchShortcut ? "/" : undefined}
        data-autofocus={autoFocus ? "" : undefined}
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

/** "4 of 14 operations" while searching, announced as it changes. */
export const SearchResultCount = () => {
  const { model } = useSpectile()
  const { query, resultCount } = useNavigation()
  const total = model.operations.length + model.webhooks.length
  return (
    <p className="spectile-result-count" role="status">
      {isSearching(query) ? `${resultCount} of ${total} operations` : ""}
    </p>
  )
}

/** The matching operations, or a way out of a search that matched nothing. */
export const SearchResults = ({ children }: { children: ReactNode }) => {
  const { query, setQuery, resultCount } = useNavigation()
  if (!isSearching(query) || resultCount > 0) return children
  return (
    <div className="spectile-no-results">
      <p>No operations match “{query.trim()}”</p>
      <button type="button" className="spectile-text-button" onClick={() => setQuery("")}>
        Clear search
      </button>
    </div>
  )
}
