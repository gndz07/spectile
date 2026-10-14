import {
  type ComponentPropsWithRef,
  type ElementType,
  type JSX,
  type ReactNode,
  type Ref,
  type RefCallback,
  cloneElement,
  isValidElement,
  useCallback,
} from "react";

type AnyProps = Record<string, unknown>;
type Handler = (...args: unknown[]) => unknown;

export type AsChildProps = { asChild?: boolean };

export type PrimitiveProps<T extends keyof JSX.IntrinsicElements> = ComponentPropsWithRef<T> &
  AsChildProps;

export type TextProps = PrimitiveProps<"span">;

const isPrevented = (event: unknown) =>
  typeof event === "object" &&
  event !== null &&
  (event as { defaultPrevented?: unknown }).defaultPrevented === true;

const composeHandlers =
  (ours: Handler, theirs: Handler): Handler =>
  (...args) => {
    theirs(...args);
    if (!isPrevented(args[0])) ours(...args);
  };

const mergeValue = (key: string, ours: unknown, theirs: unknown) => {
  if (theirs === undefined) return ours;
  if (ours === undefined) return theirs;
  if (/^on[A-Z]/.test(key) && typeof ours === "function" && typeof theirs === "function") {
    return composeHandlers(ours as Handler, theirs as Handler);
  }
  if (key === "className") return `${ours} ${theirs}`;
  if (key === "style") return { ...(ours as object), ...(theirs as object) };
  return theirs;
};

/** Their props win, except handlers (theirs run first and can `preventDefault` ours), classNames and styles. */
export const mergeProps = <A extends object, B extends object>(ours: A, theirs: B): A & B => {
  const left = ours as AnyProps;
  const right = theirs as AnyProps;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return Object.fromEntries(
    [...keys].map((key) => [key, mergeValue(key, left[key], right[key])]),
  ) as A & B;
};

const assignRef = <T,>(ref: Ref<T> | undefined, value: T | null) => {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
};

export const useComposedRefs = <T,>(...refs: (Ref<T> | undefined)[]): RefCallback<T> =>
  useCallback((node: T | null) => refs.forEach((ref) => assignRef(ref, node)), refs);

type SlotProps = AnyProps & { children?: ReactNode; ref?: Ref<unknown> };

export const Slot = ({ children, ref, ...props }: SlotProps) => {
  const child = isValidElement<AnyProps & { ref?: Ref<unknown> }>(children) ? children : undefined;
  const composedRef = useComposedRefs(ref, child?.props.ref);
  return child ? cloneElement(child, { ...mergeProps(props, child.props), ref: composedRef }) : null;
};

export const Primitive = <T extends keyof JSX.IntrinsicElements>({
  as,
  asChild,
  ...props
}: PrimitiveProps<T> & { as: T }) => {
  if (asChild) return <Slot {...(props as AnyProps)} />;
  const Tag = as as ElementType;
  return <Tag {...props} />;
};

const withDefaultChildren = (child: ReactNode, value: ReactNode) =>
  isValidElement<{ children?: ReactNode }>(child)
    ? cloneElement(child, undefined, child.props.children ?? value)
    : child;

export const Text = ({ value, children, asChild, ...props }: TextProps & { value: ReactNode }) => {
  if (value === undefined || value === null || value === false) return null;
  const content = asChild ? withDefaultChildren(children, value) : (children ?? value);
  return (
    <Primitive as="span" asChild={asChild} {...props}>
      {content}
    </Primitive>
  );
};
