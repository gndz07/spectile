import { asArray, asString, asStrings, entries, isObject } from "../json/read"
import type { Server, ServerVariable } from "../model"

export const defaultServers = (): Server[] => [{ url: "/", variables: {} }]

const serverVariables = (value: unknown): Record<string, ServerVariable> =>
  Object.fromEntries(
    entries(value).flatMap(([name, variable]) => {
      if (!isObject(variable)) return []
      const values = asStrings(variable.enum)
      return [
        [
          name,
          {
            default: asString(variable.default) ?? values[0] ?? "",
            enum: values.length > 0 ? values : undefined,
            description: asString(variable.description),
          },
        ] as const,
      ]
    }),
  )

export const serverList = (value: unknown): Server[] | undefined => {
  const servers = asArray(value)
    .filter(isObject)
    .flatMap((server) => {
      const url = asString(server.url)
      if (url === undefined) return []
      return [
        {
          url,
          description: asString(server.description),
          variables: serverVariables(server.variables),
        },
      ]
    })
  return servers.length > 0 ? servers : undefined
}
