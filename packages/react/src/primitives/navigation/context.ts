import type { OperationGroup } from "@spectile/headless"
import { createContext, useContext } from "react"
import { createRequiredContext } from "../../context"

export const [NavigationGroupProvider, useNavigationGroup, useOptionalNavigationGroup] =
  createRequiredContext<OperationGroup>("Navigation.Group")

const NavigationTreeContext = createContext(false)

export const NavigationTreeProvider = NavigationTreeContext.Provider

/** Inside `Navigation.Tree`, groups and items follow the tree keyboard pattern. */
export const useInNavigationTree = () => useContext(NavigationTreeContext)
