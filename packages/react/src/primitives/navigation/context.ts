import type { OperationGroup } from "@spectile/headless"
import { createContext, useContext } from "react"
import { createRequiredContext } from "../../context"

/** The group, and the id its `GroupToggle` takes so the group is named by it. */
export type NavigationGroupState = { group: OperationGroup; labelId: string }

export const [NavigationGroupProvider, useNavigationGroupState, useOptionalNavigationGroupState] =
  createRequiredContext<NavigationGroupState>("Navigation.Group")

export const useNavigationGroup = () => useNavigationGroupState().group

export const useOptionalNavigationGroup = () => useOptionalNavigationGroupState()?.group

const NavigationTreeContext = createContext(false)

export const NavigationTreeProvider = NavigationTreeContext.Provider

/** Inside `Navigation.Tree`, groups and items follow the tree keyboard pattern. */
export const useInNavigationTree = () => useContext(NavigationTreeContext)
