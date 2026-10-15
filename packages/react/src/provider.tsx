import type { SpecModel } from "@spectile/core";
import {
  type Navigation,
  type TryIt,
  type TryItOptions,
  createNavigation,
  createTryIt,
} from "@spectile/headless";
import { type ReactNode, useMemo } from "react";
import { createRequiredContext } from "./context";
import { MarkdownContext, type RenderMarkdown, plainText } from "./markdown";

export type SpectileContextValue = { model: SpecModel; navigation: Navigation; tryIt: TryIt };

export type SpectileProviderProps = {
  model: SpecModel;
  defaultActiveId?: string;
  /** Read once when the model changes. */
  tryIt?: TryItOptions;
  /** Turns description Markdown into elements. Without it, descriptions are plain text. */
  renderMarkdown?: RenderMarkdown;
  children?: ReactNode;
};

const [SpectileContext, useSpectile] =
  createRequiredContext<SpectileContextValue>("SpectileProvider");

export { useSpectile };

export const SpectileProvider = ({
  model,
  defaultActiveId,
  tryIt,
  renderMarkdown = plainText,
  children,
}: SpectileProviderProps) => {
  const value = useMemo(
    () => ({
      model,
      navigation: createNavigation(model, { activeId: defaultActiveId }),
      tryIt: createTryIt(model, tryIt),
    }),
    [model],
  );
  return (
    <SpectileContext value={value}>
      <MarkdownContext value={renderMarkdown}>{children}</MarkdownContext>
    </SpectileContext>
  );
};
