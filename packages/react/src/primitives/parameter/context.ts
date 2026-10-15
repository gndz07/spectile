import type { Header, Parameter } from "@spectile/core";
import { createRequiredContext } from "../../context";

export const [ParameterProvider, useParameter] = createRequiredContext<Parameter | Header>(
  "Parameter.Root",
);
