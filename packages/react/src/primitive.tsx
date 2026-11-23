import {
  type ComponentPropsWithRef,
  type ElementType,
  type JSX,
  type ReactNode,
  type Ref,
  type RefCallback,
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  useCallback,
} from "react"

type AnyProps = Record<string, unknown>
type Handler = (...args: unknown[]) => unknown

export type AsChildProps = { asChild?: boolean }

export type PrimitiveProps<T extends keyof JSX.IntrinsicElements> = ComponentPropsWithRef<T> &
  AsChildProps

export type TextProps = PrimitiveProps<"span">

const isPrevented = (event: unknown) =>
  typeof event === "object" &&
  event !== null &&
  (event as { defaultPrevented?: unknown }).defaultPrevented === true

const composeHandlers =
  (ours: Handler, theirs: Handler): Handler =>
  (...args) => {
    theirs(...args)
    if (!isPrevented(args[0])) ours(...args)
  }

const mergeValue = (key: string, ours: unknown, theirs: unknown) => {
  if (theirs === undefined) return ours
  if (ours === undefined) return theirs
  if (/^on[A-Z]/.test(key) && typeof ours === "function" && typeof theirs === "function") {
    return composeHandlers(ours as Handler, theirs as Handler)
  }
  if (key === "className") return `${ours} ${theirs}`
  if (key === "style") return { ...(ours as object), ...(theirs as object) }
  return theirs
}

/** Their props win, except handlers (theirs run first and can `preventDefault` ours), classNames and styles. */
export const mergeProps = <A extends object, B extends object>(ours: A, theirs: B): A & B => {
  const left = ours as AnyProps
  const right = theirs as AnyProps
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  return Object.fromEntries(
    [...keys].map((key) => [key, mergeValue(key, left[key], right[key])]),
  ) as A & B
}

const assignRef = <T,>(ref: Ref<T> | undefined, value: T | null) => {
  if (typeof ref === "function") return ref(value)
  if (ref) ref.current = value
}

/** Runs each callback ref's cleanup when it returns one (React 19), else resets it to `null`. */
export const useComposedRefs = <T,>(a: Ref<T> | undefined, b: Ref<T> | undefined): RefCallback<T> =>
  useCallback(
    (node: T | null) => {
      const refs = [a, b]
      const cleanups = refs.map((ref) => assignRef(ref, node))
      return () =>
        cleanups.forEach((cleanup, index) =>
          typeof cleanup === "function" ? cleanup() : assignRef(refs[index], null),
        )
    },
    [a, b],
  )

type SlotProps = AnyProps & { children?: ReactNode; ref?: Ref<unknown> }

const slotChild = (children: ReactNode) => {
  const child = Children.only(children)
  if (!isValidElement<AnyProps & { ref?: Ref<unknown> }>(child) || child.type === Fragment) {
    throw new Error("asChild needs a single element child, not text or a Fragment")
  }
  return child
}

export const Slot = ({ children, ref, ...props }: SlotProps) => {
  const child = slotChild(children)
  const composedRef = useComposedRefs(ref, child.props.ref)
  return cloneElement(child, { ...mergeProps(props, child.props), ref: composedRef })
}

export const Primitive = <T extends keyof JSX.IntrinsicElements>({
  as,
  asChild,
  ...props
}: PrimitiveProps<T> & { as: T }) => {
  if (asChild) return <Slot {...(props as AnyProps)} />
  const Tag = as as ElementType
  return <Tag {...props} />
}

const withDefaultChildren = (child: ReactNode, value: ReactNode) =>
  isValidElement<{ children?: ReactNode }>(child)
    ? cloneElement(child, undefined, child.props.children ?? value)
    : child

export const Text = <T extends "span" | "div" | "a" = "span">({
  as,
  value,
  children,
  asChild,
  ...props
}: PrimitiveProps<T> & { as?: T; value: ReactNode }) => {
  if (value === undefined || value === null || value === false) return null
  const content = asChild ? withDefaultChildren(children, value) : (children ?? value)
  return (
    <Primitive as={(as ?? "span") as "span"} asChild={asChild} {...(props as TextProps)}>
      {content}
    </Primitive>
  )
}

export const RequiredText = ({ required, ...props }: TextProps & { required: boolean }) => (
  <Text value={required ? "required" : undefined} {...props} />
)
