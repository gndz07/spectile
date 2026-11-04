import { firstGroupOf } from "@spectile/headless"
import { useNavigation, useSpectile } from "@spectile/react"
import { useCallback, useState } from "react"
import { useTheme } from "./context"
import { CloseButton, Dialog } from "./dialog"
import { useSearchShortcut } from "./hash"
import { MenuIcon, SearchIcon } from "./icons"
import { groupLabel } from "./search"
import { ApiHeading, OperationNavigation } from "./sidebar"

/** The active operation's group, then the operation; phones show the group alone. */
const Breadcrumb = () => {
  const { model } = useSpectile()
  const { active } = useNavigation()
  const group = active && firstGroupOf(model, active.id)
  if (!active || !group) return null
  return (
    <p className="spectile-breadcrumb">
      {groupLabel(group)}
      <span className="spectile-breadcrumb-current">
        <span aria-hidden> / </span>
        {active.summary ?? active.path}
      </span>
    </p>
  )
}

type Opener = "menu" | "search"

/** Below 960px: an Operations button, a breadcrumb and search, opening the navigation drawer. */
export const TopBar = () => {
  const { searchShortcut } = useTheme()
  const [opener, setOpener] = useState<Opener>()
  const openSearch = useCallback(() => setOpener("search"), [])
  useSearchShortcut(searchShortcut, openSearch)
  const close = () => setOpener(undefined)
  return (
    <>
      <header className="spectile-top-bar">
        <button
          type="button"
          className="spectile-button spectile-menu-button"
          aria-label="Operations"
          aria-haspopup="dialog"
          onClick={() => setOpener("menu")}
        >
          <MenuIcon />
          <span className="spectile-menu-label">Operations</span>
        </button>
        <Breadcrumb />
        <button
          type="button"
          className="spectile-icon-button"
          aria-label="Search operations"
          aria-haspopup="dialog"
          onClick={openSearch}
        >
          <SearchIcon />
        </button>
      </header>
      <Dialog open={!!opener} onClose={close} label="Operations" className="spectile-nav-drawer">
        <header className="spectile-overlay-header">
          <ApiHeading />
          <CloseButton onClick={close} />
        </header>
        <OperationNavigation onSelect={close} autoFocusSearch={opener === "search"} />
      </Dialog>
    </>
  )
}
