export type EventLike = { preventDefault: () => void }

export type KeyboardEventLike = EventLike & { key: string }

export type InputEventLike = { currentTarget: { value: string } }
