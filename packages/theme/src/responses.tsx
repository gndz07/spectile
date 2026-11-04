import type { Response as ResponseModel } from "@spectile/core"
import { Response } from "@spectile/react"
import { useId, useState } from "react"
import { SectionTitle, statusTone } from "./bits"
import { useTheme } from "./context"
import { CollapsibleExample } from "./examples"
import { ChevronIcon } from "./icons"
import { useOperationUi } from "./operation-state"
import { ParameterRow } from "./parameters"
import { Collapse } from "./presence"
import { SchemaView } from "./schema"

const ResponseBody = ({ response }: { response: ResponseModel }) => {
  const { tryIt } = useTheme()
  if (response.content.length === 0) return <p className="spectile-muted">No content</p>
  return response.content.map((media) => (
    <div key={media.mediaType} className="spectile-media">
      {media.schema && (
        <SchemaView
          schema={media.schema}
          label={`${response.status} ${media.mediaType} schema`}
          header={<span className="spectile-media-type">{media.mediaType}</span>}
        />
      )}
      {tryIt !== "panel" && <CollapsibleExample media={media} usage="response" />}
    </div>
  ))
}

const ResponseItem = ({ response }: { response: ResponseModel }) => {
  const [open, setOpen] = useState(false)
  const { tryIt } = useTheme()
  const { showExample } = useOperationUi()
  const id = useId()
  const toggle = () => {
    if (!open && tryIt === "panel") showExample(response.status)
    setOpen(!open)
  }
  return (
    <Response.Root
      response={response}
      className="spectile-response"
      data-state={open ? "open" : "closed"}
      data-tone={statusTone(response.status)}
      role="listitem"
    >
      <div
        className="spectile-response-header"
        onClick={(event) => {
          if (!(event.target as Element).closest("a")) toggle()
        }}
      >
        <button
          type="button"
          className="spectile-disclosure"
          aria-expanded={open}
          aria-controls={id}
          aria-describedby={`${id}-description`}
          onClick={(event) => {
            event.stopPropagation()
            toggle()
          }}
        >
          <ChevronIcon />
          <Response.Status className="spectile-status-code" />
        </button>
        <Response.Description id={`${id}-description`} className="spectile-prose" />
      </div>
      <Collapse open={open}>
        <div id={id} className="spectile-response-body">
          {response.headers.length > 0 && (
            <div role="list" className="spectile-rows" aria-label="Headers">
              {response.headers.map((header) => (
                <ParameterRow key={header.name} parameter={header} />
              ))}
            </div>
          )}
          <ResponseBody response={response} />
        </div>
      </Collapse>
    </Response.Root>
  )
}

export const Responses = ({ responses }: { responses: ResponseModel[] }) =>
  responses.length === 0 ? null : (
    <section className="spectile-section">
      <SectionTitle>Responses</SectionTitle>
      <div role="list" className="spectile-responses">
        {responses.map((response) => (
          <ResponseItem key={response.status} response={response} />
        ))}
      </div>
    </section>
  )
