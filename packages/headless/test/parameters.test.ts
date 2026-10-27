import { normalize } from "@spectile/core"
import { describe, expect, it } from "vitest"
import { groupParameters } from "../src"

describe("groupParameters", () => {
  it("groups by location in path, query, header, cookie order", () => {
    const [operation] = normalize({
      openapi: "3.1.0",
      info: { title: "Params", version: "1.0.0" },
      paths: {
        "/pets/{id}": {
          get: {
            parameters: [
              { name: "trace", in: "header" },
              { name: "limit", in: "query" },
              { name: "id", in: "path", required: true },
              { name: "sort", in: "query" },
            ],
            responses: {},
          },
        },
      },
    }).operations
    expect(
      groupParameters(operation!.parameters).map(({ location, parameters }) => [
        location,
        parameters.map(({ name }) => name),
      ]),
    ).toEqual([
      ["path", ["id"]],
      ["query", ["limit", "sort"]],
      ["header", ["trace"]],
    ])
  })
})
