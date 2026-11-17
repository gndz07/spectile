import type { ExternalDocs as ExternalDocsModel, SchemaNode } from "@spectile/core"
import { schemaAllowedValues } from "@spectile/headless"
import { Copy, ExternalDocs, Json, useJsonLine } from "@spectile/react"
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

const REASONS: Record<string, string> = {
  "200": "OK",
  "201": "Created",
  "202": "Accepted",
  "204": "No content",
  "301": "Moved permanently",
  "302": "Found",
  "304": "Not modified",
  "400": "Bad request",
  "401": "Unauthorized",
  "403": "Forbidden",
  "404": "Not found",
  "405": "Method not allowed",
  "409": "Conflict",
  "410": "Gone",
  "412": "Precondition failed",
  "415": "Unsupported media type",
  "422": "Unprocessable content",
  "429": "Too many requests",
  "500": "Internal server error",
  "502": "Bad gateway",
  "503": "Service unavailable",
  "504": "Gateway timeout",
  "1XX": "Informational",
  "2XX": "Success",
  "3XX": "Redirect",
  "4XX": "Client error",
  "5XX": "Server error",
}

/** `default` reads "Other". */
export const statusCodeLabel = (status: string) => (status === "default" ? "Other" : status)

/** The reason phrase, e.g. "Created"; undefined for `default` and unknown codes. */
export const statusReason = (status: string) => REASONS[status.toUpperCase()]

/** "201 Created", or "Other" for `default`. */
export const statusLabel = (status: string) =>
  [statusCodeLabel(status), statusReason(status)].filter(Boolean).join(" ")

const MEDIA_LABELS: Record<string, string> = {
  "application/json": "JSON",
  "application/xml": "XML",
  "text/xml": "XML",
  "text/plain": "Text",
  "text/html": "HTML",
  "text/csv": "CSV",
  "multipart/form-data": "Form data",
  "application/x-www-form-urlencoded": "Form",
  "application/octet-stream": "Binary",
}

/** "JSON" for `application/json` and `application/problem+json`; other types as written. */
export const mediaTypeLabel = (mediaType: string) => {
  const base = mediaType.split(";")[0]!.trim().toLowerCase()
  return MEDIA_LABELS[base] ?? (base.endsWith("+json") ? "JSON" : mediaType)
}

const MAX_VALUES = 8

const valueText = (kind: "const" | "enum", value: unknown) =>
  kind === "enum" && typeof value === "string" ? value : (JSON.stringify(value) ?? String(value))

/** The type, then ", one of" and a chip per allowed value, or a const's one chip. */
export const TypeWithValues = ({ type, node }: { type: ReactNode; node?: SchemaNode }) => {
  const allowed = node && schemaAllowedValues(node)
  const shown = allowed?.values.slice(0, MAX_VALUES) ?? []
  const more = (allowed?.values.length ?? 0) - shown.length
  return (
    <>
      <span className="spectile-type">
        {type}
        {allowed?.kind === "enum" && ", one of"}
      </span>
      {allowed &&
        shown.map((value, index) => (
          <code key={index} className="spectile-value">
            {valueText(allowed.kind, value)}
          </code>
        ))}
      {more > 0 && <span className="spectile-type">and {more} more</span>}
    </>
  )
}

export type TagTone = "required" | "deprecated" | "neutral" | "webhook"

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

type CodeProps = {
  text: string
  label: string
  /** Objects this deep start folded; see `Json.Root`. */
  foldDepth?: number
}

const itemCount = (size: number) => `${size} ${size === 1 ? "item" : "items"}`

/** A folded array reads `[ 3 items ]`; a folded object `{ … }`. */
const Tokens = () => {
  const { tokens, fold } = useJsonLine()
  return tokens.map((token, index) => (
    <span key={index} data-kind={token.kind}>
      {fold && token.kind === "ellipsis" && tokens[index - 1]?.text === "["
        ? ` ${itemCount(fold.size)} `
        : token.text}
    </span>
  ))
}

/** JSON (foldable) or plain text, for a header that holds the copy button. */
export const Code = ({ text, label, foldDepth }: CodeProps) => (
  <Json.Root
    text={text}
    foldDepth={foldDepth}
    className="spectile-code"
    role="region"
    aria-label={label}
    tabIndex={0}
  >
    <Json.Lines>
      {(line) => (
        <Json.Line line={line} className="spectile-code-line">
          <Json.Toggle className="spectile-fold" aria-label={line.folded ? "Expand" : "Collapse"}>
            <ChevronIcon />
          </Json.Toggle>
          <Tokens />
        </Json.Line>
      )}
    </Json.Lines>
  </Json.Root>
)

/** `Code` with its copy button in the top-right corner. */
export const CodeBlock = (props: CodeProps) => (
  <div className="spectile-code-frame">
    <Code {...props} />
    <CopyButton text={props.text} label={`Copy ${props.label}`} />
  </div>
)
