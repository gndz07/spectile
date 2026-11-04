import type { ExternalDocs as ExternalDocsModel } from "@spectile/core"
import { Copy, ExternalDocs, Json } from "@spectile/react"
import { type ReactNode, createContext, useContext } from "react"
import { ChevronIcon, CopyIcon, ExternalLinkIcon } from "./icons"

const SectionLevel = createContext<2 | 4>(2)

/** Section headings sit one level below the operation's heading: h1 on a page, h3 in a stacked row. */
export const SectionLevelProvider = SectionLevel.Provider

export const SectionTitle = ({
  className = "spectile-section-title",
  children,
}: {
  className?: string
  children: ReactNode
}) => {
  const Heading = `h${useContext(SectionLevel)}` as const
  return <Heading className={className}>{children}</Heading>
}

export type StatusTone = "success" | "redirect" | "client-error" | "server-error" | "neutral"

const TONES: Record<string, StatusTone> = {
  "2": "success",
  "3": "redirect",
  "4": "client-error",
  "5": "server-error",
}

/** `201` and `2XX` are success; `default` and anything unknown is neutral. */
export const statusTone = (status: string | number): StatusTone =>
  TONES[String(status)[0] ?? ""] ?? "neutral"

export type TagTone = "required" | "deprecated" | "neutral" | "recursive" | "webhook"

export const Tag = ({ tone, children }: { tone: TagTone; children: ReactNode }) => (
  <span className="spectile-tag" data-tone={tone}>
    {children}
  </span>
)

export const DocsLink = ({ externalDocs }: { externalDocs?: ExternalDocsModel }) => (
  <ExternalDocs.Root externalDocs={externalDocs} className="spectile-docs">
    <ExternalDocs.Description className="spectile-prose" />
    <ExternalDocs.Link target="_blank" rel="noreferrer" className="spectile-link">
      Documentation <ExternalLinkIcon />
    </ExternalDocs.Link>
  </ExternalDocs.Root>
)

export const CopyButton = ({ text, label }: { text: string; label: string }) => (
  <Copy text={text} className="spectile-icon-button" aria-label={label} title={label}>
    <CopyIcon />
  </Copy>
)

/** A dark block with its copy button in the top-right corner. */
export const CodeFrame = ({
  copy,
  copyLabel,
  children,
}: {
  copy: string
  copyLabel: string
  children: ReactNode
}) => (
  <div className="spectile-code-frame">
    {children}
    <CopyButton text={copy} label={copyLabel} />
  </div>
)

/** A dark code block for JSON (foldable) or plain text, with a copy button. */
export const CodeBlock = ({ text, label }: { text: string; label: string }) => (
  <CodeFrame copy={text} copyLabel={`Copy ${label}`}>
    <Json.Root text={text} className="spectile-code" role="region" aria-label={label} tabIndex={0}>
      <Json.Lines>
        {(line) => (
          <Json.Line line={line} className="spectile-code-line">
            <Json.Toggle className="spectile-fold" aria-label={line.folded ? "Expand" : "Collapse"}>
              <ChevronIcon />
            </Json.Toggle>
            <Json.Tokens />
          </Json.Line>
        )}
      </Json.Lines>
    </Json.Root>
  </CodeFrame>
)
