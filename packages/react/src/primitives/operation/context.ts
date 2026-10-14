import type { NormalizedOperation } from "@spectile/core";
import { createRequiredContext } from "../../context";

export const [OperationProvider, useOperationContext] =
  createRequiredContext<NormalizedOperation>("Operation.Root");
