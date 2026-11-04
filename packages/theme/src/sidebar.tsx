import { Info, Navigation, Operation } from "@spectile/react"
import type { ReactNode } from "react"
import { writeOperationHash } from "./hash"
import { Collapse } from "./presence"
import { Search, SearchResultCount, SearchResults, groupLabel } from "./search"

const GroupItems = ({ children }: { children: ReactNode }) => (
  <Collapse open={Navigation.useGroupOpen()}>
    <Navigation.GroupItems forceMount className="spectile-nav-items">
      {children}
    </Navigation.GroupItems>
  </Collapse>
)

const OperationTree = ({ onSelect }: { onSelect?: () => void }) => (
  <Navigation.Tree className="spectile-nav" aria-label="Operations">
    <Navigation.Groups>
      {(group) => (
        <Navigation.Group group={group} className="spectile-nav-group" aria-label={groupLabel(group)}>
          <Navigation.GroupToggle className="spectile-nav-heading">
            {groupLabel(group)}
          </Navigation.GroupToggle>
          <GroupItems>
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
          </GroupItems>
        </Navigation.Group>
      )}
    </Navigation.Groups>
  </Navigation.Tree>
)

/** Search, a live result count and the operations grouped by tag. `onSelect` runs after a pick. */
export const OperationNavigation = ({
  onSelect,
  autoFocusSearch,
}: {
  onSelect?: () => void
  autoFocusSearch?: boolean
}) => (
  <>
    <Search placeholder="Search" autoFocus={autoFocusSearch} />
    <SearchResultCount />
    <SearchResults>
      <OperationTree onSelect={onSelect} />
    </SearchResults>
  </>
)

export const ApiHeading = () => (
  <div className="spectile-api-heading">
    <Info.Title className="spectile-api-title" />
    <Info.Version className="spectile-version" />
  </div>
)

export const Sidebar = () => (
  <nav className="spectile-sidebar" aria-label="API reference">
    <div className="spectile-sidebar-inner">
      <ApiHeading />
      <OperationNavigation />
    </div>
  </nav>
)
