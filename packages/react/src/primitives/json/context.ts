import type { JsonFolds, VisibleJsonLine } from "@spectile/headless"
import { createRequiredContext } from "../../context"

export type JsonState = JsonFolds & { lines: VisibleJsonLine[] }

export const [JsonProvider, useJson] = createRequiredContext<JsonState>("Json.Root")

export const [JsonLineProvider, useJsonLine] = createRequiredContext<VisibleJsonLine>("Json.Line")
