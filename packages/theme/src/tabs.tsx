import { type KeyboardEvent, type ReactNode, useId, useRef } from "react"

export type Tab<T extends string> = { value: T; label: ReactNode }

type TabsProps<T extends string> = {
  tabs: Tab<T>[]
  selected: T
  onSelect: (value: T) => void
  label: string
  children: ReactNode
  className?: string
}

const STEPS: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 }

/** Tabs with the ARIA pattern: one tab stop, arrow keys move and select. */
export const Tabs = <T extends string>({
  tabs,
  selected,
  onSelect,
  label,
  children,
  className,
}: TabsProps<T>) => {
  const id = useId()
  const list = useRef<HTMLDivElement>(null)
  const onKeyDown = (event: KeyboardEvent) => {
    const step = STEPS[event.key]
    if (!step) return
    event.preventDefault()
    const index = tabs.findIndex((tab) => tab.value === selected)
    const next = (index + step + tabs.length) % tabs.length
    onSelect(tabs[next]!.value)
    list.current?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus()
  }
  return (
    <div className={className}>
      <div ref={list} role="tablist" aria-label={label} className="spectile-tabs" onKeyDown={onKeyDown}>
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            id={`${id}-${tab.value}`}
            aria-selected={tab.value === selected}
            aria-controls={`${id}-panel`}
            tabIndex={tab.value === selected ? 0 : -1}
            className="spectile-tab"
            onClick={() => onSelect(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        key={selected}
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-${selected}`}
        className="spectile-tab-panel"
      >
        {children}
      </div>
    </div>
  )
}
