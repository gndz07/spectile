import type { Response } from "@spectile/core";
import { createRequiredContext } from "../../context";

export const [ResponseProvider, useResponse] = createRequiredContext<Response>("Response.Root");
