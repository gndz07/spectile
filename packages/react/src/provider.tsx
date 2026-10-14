import type { SpecModel } from "@spectile/core";
import { type Navigation, createNavigation } from "@spectile/headless";
import { type ReactNode, useMemo } from "react";
import { createRequiredContext } from "./context";

export type SpectileContextValue = { model: SpecModel; navigation: Navigation };

export type SpectileProviderProps = {
  model: SpecModel;
  defaultActiveId?: string;
  children?: ReactNode;
};

const [SpectileContext, useSpectile] =
  createRequiredContext<SpectileContextValue>("SpectileProvider");

export { useSpectile };

export const SpectileProvider = ({ model, defaultActiveId, children }: SpectileProviderProps) => {
  const value = useMemo(
    () => ({ model, navigation: createNavigation(model, { activeId: defaultActiveId }) }),
    [model],
  );
  return <SpectileContext value={value}>{children}</SpectileContext>;
};
