import { describe, expect, it } from "vitest"
import { bodyFields, exampleFromSchema, getMergedSchema, normalize } from "../src"

const model = normalize({
  openapi: "3.1.0",
  info: { title: "Merge", version: "1.0.0" },
  components: {
    schemas: {
      Base: {
        type: "object",
        title: "Base",
        description: "Base description",
        required: ["id"],
        properties: { id: { type: "string" }, name: { type: "string" } },
      },
      Admin: {
        description: "An admin",
        allOf: [
          { $ref: "#/components/schemas/Base" },
          { required: ["name"], properties: { role: { type: "string" } } },
        ],
      },
      Mixed: { allOf: [{ type: "string" }, { type: "object", properties: { a: {} } }] },
      Count: { allOf: [{ type: "number", minimum: 1 }, { type: "integer", maximum: 9 }] },
      Node: {
        type: "object",
        properties: { child: { $ref: "#/components/schemas/Node" } },
        allOf: [{ $ref: "#/components/schemas/Node" }],
      },
      Choice: {
        allOf: [{ oneOf: [{ type: "string" }, { type: "integer" }] }, { oneOf: [{ type: "boolean" }] }],
      },
    },
  },
})

const merged = (name: string) => getMergedSchema(model, `#/components/schemas/${name}`)

describe("mergeAllOf", () => {
  it("merges parts into one flat list with combined required names", () => {
    expect(merged("Admin")).toMatchObject({
      refName: "Admin",
      types: ["object"],
      title: "Base",
      description: "An admin",
      required: ["id", "name"],
      properties: [
        { name: "id", required: true },
        { name: "name", required: true },
        { name: "role", required: false },
      ],
      allOf: [],
    })
  })

  it("keeps parts with no shared type separate", () => {
    expect(merged("Mixed")).toMatchObject({
      types: ["string"],
      properties: [],
      allOf: [{ pointer: "#/components/schemas/Mixed/allOf/1" }],
    })
  })

  it("narrows number and integer and combines constraints", () => {
    expect(merged("Count")).toMatchObject({
      types: ["integer"],
      constraints: { minimum: 1, maximum: 9 },
    })
  })

  it("keeps a part that refers back to the schema separate", () => {
    expect(merged("Node").allOf).toEqual([
      { pointer: "#/components/schemas/Node", refName: "Node", circular: true },
    ])
  })

  it("lifts a oneOf from a part, keeping a second one separate", () => {
    const choice = merged("Choice")
    expect(choice.oneOf).toHaveLength(2)
    expect(choice.allOf).toEqual([expect.objectContaining({ pointer: expect.stringMatching(/1$/) })])
  })

  it("is used for examples and form fields", () => {
    const ref = { pointer: "#/components/schemas/Admin", circular: false }
    expect(exampleFromSchema(model, ref)).toEqual({ id: "string", name: "string", role: "string" })
    expect(
      bodyFields(model, { mediaType: "application/x-www-form-urlencoded", schema: ref, examples: [] }),
    ).toMatchObject([
      { name: "id", required: true },
      { name: "name", required: true },
      { name: "role", required: false },
    ])
  })
})
