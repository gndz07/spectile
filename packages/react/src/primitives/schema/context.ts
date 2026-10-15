import type { SchemaRow } from "@spectile/headless"
import { createRequiredContext } from "../../context"
import type { SchemaTreeState } from "../../hooks"

export const [SchemaProvider, useSchema] = createRequiredContext<SchemaTreeState>("Schema.Root")

export const [SchemaRowProvider, useSchemaRow] = createRequiredContext<SchemaRow>("Schema.Row")
