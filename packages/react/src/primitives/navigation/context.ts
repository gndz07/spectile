import type { OperationGroup } from "@spectile/headless"
import { createRequiredContext } from "../../context"

export const [NavigationGroupProvider, useNavigationGroup] =
  createRequiredContext<OperationGroup>("Navigation.Group")
