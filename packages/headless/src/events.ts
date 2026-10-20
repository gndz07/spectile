import type { FileLike } from "@spectile/core"

export type EventLike ={ preventDefault: () => void }

export type KeyboardEventLike = EventLike & { key: string }

export type InputEventLike = { currentTarget: { value: string } }

export type FileInputEventLike = { currentTarget: { files: ArrayLike<FileLike> | null } }
