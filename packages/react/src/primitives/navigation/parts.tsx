import type { NormalizedOperation } from "@spectile/core"
import { type OperationGroup, groupKey, matchRanges } from "@spectile/headless"
import { Fragment, type ReactNode } from "react"
import { useFollowFocus } from "../../focus"
import { useNavigation } from "../../hooks"
import { type DescriptionProps, Markdown } from "../../markdown"
import {
  Primitive,
  type PrimitiveProps,
  Text,
  type TextProps,
  mergeProps,
  useComposedRefs,
} from "../../primitive"
import { OperationProvider } from "../operation/context"
import {
  NavigationGroupProvider,
  NavigationTreeProvider,
  useInNavigationTree,
  useNavigationGroup,
  useOptionalNavigationGroup,
} from "./context"

export type SearchProps = PrimitiveProps<"input">

export const Search = (props: SearchProps) => (
  <Primitive as="input" {...mergeProps(useNavigation().getSearchProps(), props)} />
)

/** How many operations match the search, announced politely as it changes. */
export const ResultCount = (props: TextProps) => (
  <Text value={useNavigation().resultCount} role="status" aria-live="polite" {...props} />
)

export type HighlightProps = TextProps & { text: string }

/** The text with each match of the search query in a `<mark>`. */
export const Highlight = ({ text, ...props }: HighlightProps) => {
  const ranges = matchRanges(text, useNavigation().query)
  const parts = ranges.flatMap((range, index) => [
    text.slice(ranges[index - 1]?.end ?? 0, range.start),
    <mark key={range.start}>{text.slice(range.start, range.end)}</mark>,
  ])
  return <Text value={[...parts, text.slice(ranges.at(-1)?.end ?? 0)]} {...props} />
}

export type TreeProps = PrimitiveProps<"div">

/** Makes the groups and items inside one keyboard tree: arrows move, Left and Right fold groups. */
export const Tree = (props: TreeProps) => (
  <NavigationTreeProvider value>
    <Primitive as="div" {...mergeProps(useNavigation().getTreeProps(), props)} />
  </NavigationTreeProvider>
)

export type GroupsProps = { children: (group: OperationGroup) => ReactNode }

/** Calls its child function once per tag with matching operations, then for untagged ones, then for webhooks. */
export const Groups = ({ children }: GroupsProps) =>
  useNavigation().groups.map((group) => (
    <Fragment key={groupKey(group)}>{children(group)}</Fragment>
  ))

export type GroupProps = PrimitiveProps<"div"> & { group: OperationGroup }

export const Group = ({ group, ref, ...props }: GroupProps) => {
  const navigation = useNavigation()
  const inTree = useInNavigationTree()
  const focusRef = useFollowFocus<HTMLDivElement>(inTree && navigation.focusedId === groupKey(group))
  const composedRef = useComposedRefs(ref, focusRef)
  const ours = inTree ? navigation.getGroupProps(group) : { "data-kind": group.kind }
  return (
    <NavigationGroupProvider value={group}>
      <Primitive as="div" {...mergeProps(ours, props)} ref={composedRef} />
    </NavigationGroupProvider>
  )
}

/** The tag's name. Nothing for the untagged and webhook groups. */
export const GroupName = (props: TextProps) => (
  <Text value={useNavigationGroup().tag?.name} {...props} />
)

export const GroupDescription = (props: DescriptionProps) => (
  <Markdown source={useNavigationGroup().tag?.description} {...props} />
)

export type GroupToggleProps = PrimitiveProps<"div">

/** The group's heading; clicking it opens or closes the group. */
export const GroupToggle = (props: GroupToggleProps) => {
  const ours = useNavigation().getGroupToggleProps(useNavigationGroup())
  return <Primitive as="div" {...mergeProps(ours, props)} />
}

/** Whether the enclosing group is open: its items show. */
export const useGroupOpen = () => {
  const id = groupKey(useNavigationGroup())
  return useNavigation().rows.find((row) => row.id === id)?.expanded !== false
}

export type GroupItemsProps = PrimitiveProps<"div"> & {
  /** Render while the group is closed too, e.g. to animate it closing. */
  forceMount?: boolean
}

/** Holds the group's items; renders nothing while the group is closed, unless `forceMount`. */
export const GroupItems = ({ forceMount, ...props }: GroupItemsProps) => {
  const open = useGroupOpen()
  if (!open && !forceMount) return null
  const ours = { role: "group", "data-state": open ? "open" : "closed" }
  return <Primitive as="div" {...mergeProps(ours, props)} />
}

export type ItemProps = PrimitiveProps<"button"> & { operation: NormalizedOperation }

/** A button that makes the operation active. `Operation.*` parts inside it show that operation. */
export const Item = ({ operation, ref, ...props }: ItemProps) => {
  const navigation = useNavigation()
  const group = useOptionalNavigationGroup()
  const treeGroup = useInNavigationTree() ? group : undefined
  const rowId = treeGroup
    ? navigation.rows.find(
        (row) => row.operation?.id === operation.id && row.parentId === groupKey(treeGroup),
      )?.id
    : undefined
  const focusRef = useFollowFocus<HTMLButtonElement>(
    rowId !== undefined && navigation.focusedId === rowId,
  )
  const composedRef = useComposedRefs(ref, focusRef)
  const ours = { type: "button" as const, ...navigation.getItemProps(operation, treeGroup) }
  return (
    <OperationProvider value={operation}>
      <Primitive as="button" {...mergeProps(ours, props)} ref={composedRef} />
    </OperationProvider>
  )
}
