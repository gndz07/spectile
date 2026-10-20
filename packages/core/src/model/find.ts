import type { NormalizedOperation, SpecModel } from "./types"

/** Looks in both operations and webhooks; their ids never clash. */
export const findOperation = (
  { operations, webhooks }: Pick<SpecModel, "operations" | "webhooks">,
  id: string | undefined,
): NormalizedOperation | undefined =>
  [...operations, ...webhooks].find((operation) => operation.id === id)
