import type { Parameter, ParameterLocation } from "@spectile/core"

export type ParameterGroup = { location: ParameterLocation; parameters: Parameter[] }

const LOCATIONS: readonly ParameterLocation[] = ["path", "query", "header", "cookie"]

/** Path, query, header, then cookie parameters, leaving out empty groups. */
export const groupParameters = (parameters: readonly Parameter[]): ParameterGroup[] =>
  LOCATIONS.map((location) => ({
    location,
    parameters: parameters.filter((parameter) => parameter.in === location),
  })).filter((group) => group.parameters.length > 0)
