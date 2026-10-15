import type { NormalizedOperation } from "@spectile/core";
import type { OperationGroup } from "@spectile/headless";
import { Fragment, type ReactNode } from "react";
import { useNavigation } from "../../hooks";
import { type DescriptionProps, Markdown } from "../../markdown";
import { Primitive, type PrimitiveProps, Text, type TextProps, mergeProps } from "../../primitive";
import { OperationProvider } from "../operation/context";
import { NavigationGroupProvider, useNavigationGroup } from "./context";

export type SearchProps = PrimitiveProps<"input">;

export const Search = (props: SearchProps) => (
  <Primitive as="input" {...mergeProps(useNavigation().getSearchProps(), props)} />
);

export type GroupsProps = { children: (group: OperationGroup) => ReactNode };

/** Calls its child function once per tag with matching operations, then once for untagged ones. */
export const Groups = ({ children }: GroupsProps) =>
  useNavigation().groups.map((group) => (
    <Fragment key={group.tag?.name ?? ""}>{children(group)}</Fragment>
  ));

export type GroupProps = PrimitiveProps<"div"> & { group: OperationGroup };

export const Group = ({ group, ...props }: GroupProps) => (
  <NavigationGroupProvider value={group}>
    <Primitive as="div" {...props} />
  </NavigationGroupProvider>
);

/** The tag's name. Nothing for the untagged group. */
export const GroupName = (props: TextProps) => (
  <Text value={useNavigationGroup().tag?.name} {...props} />
);

export const GroupDescription = (props: DescriptionProps) => (
  <Markdown source={useNavigationGroup().tag?.description} {...props} />
);

export type ItemProps = PrimitiveProps<"button"> & { operation: NormalizedOperation };

/** A button that makes the operation active. `Operation.*` parts inside it show that operation. */
export const Item = ({ operation, ...props }: ItemProps) => {
  const ours = { type: "button" as const, ...useNavigation().getItemProps(operation) };
  return (
    <OperationProvider value={operation}>
      <Primitive as="button" {...mergeProps(ours, props)} />
    </OperationProvider>
  );
};
