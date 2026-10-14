import { createRequiredContext } from "../../context";
import type { TryItState } from "../../hooks";

export const [TryItProvider, useTryItContext] = createRequiredContext<TryItState>("TryIt.Root");
