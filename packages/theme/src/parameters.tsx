import { type Header, type Parameter as ParameterModel, getMergedSchema, parameterKey } from "@spectile/core"
import { groupParameters, schemaConstraintsLabel, schemaDefaultLabel } from "@spectile/headless"
import { Parameter, useParameter, useSpectile } from "@spectile/react"
import { Tag } from "./bits"

const LOCATION_LABELS = { path: "Path", query: "Query", header: "Header", cookie: "Cookie" }

const useParameterSchema = () => {
  const { model } = useSpectile()
  const { schema, content } = useParameter()
  const ref = schema ?? content[0]?.schema
  return ref && getMergedSchema(model, ref)
}

const Details = () => {
  const node = useParameterSchema()
  const constraints = node && schemaConstraintsLabel(node)
  return constraints ? <p className="spectile-constraints">{constraints}</p> : null
}

const Default = () => {
  const node = useParameterSchema()
  const label = node && schemaDefaultLabel(node)
  return label ? <> {label}</> : null
}

export const ParameterRow = ({ parameter }: { parameter: ParameterModel | Header }) => (
  <Parameter.Root parameter={parameter} className="spectile-row" role="listitem">
    <div className="spectile-row-line">
      <Parameter.Name className="spectile-name" />
      <span className="spectile-type">
        <Parameter.Type />
        <Default />
      </span>
      {parameter.required && <Tag tone="required">required</Tag>}
      {parameter.deprecated && <Tag tone="deprecated">deprecated</Tag>}
    </div>
    <Parameter.Description className="spectile-description spectile-prose" />
    <Details />
  </Parameter.Root>
)

/** One section per location: path, query, header, cookie. */
export const Parameters = ({ parameters }: { parameters: ParameterModel[] }) =>
  groupParameters(parameters).map(({ location, parameters: located }) => (
    <section key={location} className="spectile-section">
      <h2 className="spectile-section-title">{LOCATION_LABELS[location]} parameters</h2>
      <div role="list" className="spectile-rows">
        {located.map((parameter) => (
          <ParameterRow key={parameterKey(parameter)} parameter={parameter} />
        ))}
      </div>
    </section>
  ))
