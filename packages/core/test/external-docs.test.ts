import { describe, expect, it } from "vitest"
import { getSchema, normalize } from "../src"

const docs = (name: string) => ({ url: `https://docs.example.com/${name}`, description: name })

const model = normalize({
  openapi: "3.1.0",
  info: { title: "Docs", version: "1.0.0" },
  externalDocs: docs("api"),
  tags: [
    { name: "pets", externalDocs: docs("pets") },
    { name: "users", externalDocs: {} },
  ],
  paths: { "/pets": { get: { tags: ["pets"], externalDocs: docs("list"), responses: {} } } },
  components: {
    schemas: {
      Pet: { type: "object", externalDocs: docs("pet") },
      Owner: {
        type: "object",
        properties: { pet: { $ref: "#/components/schemas/Pet", externalDocs: docs("owned") } },
      },
    },
  },
})

describe("externalDocs", () => {
  it("normalizes the document's, tags' and operations' links", () => {
    expect(model.externalDocs).toEqual(docs("api"))
    expect(model.tags.map(({ externalDocs }) => externalDocs)).toEqual([docs("pets"), undefined])
    expect(model.operations[0]?.externalDocs).toEqual(docs("list"))
  })

  it("reads schemas' links, letting one next to a $ref win", () => {
    expect(getSchema(model, "#/components/schemas/Pet").externalDocs).toEqual(docs("pet"))
    const [pet] = getSchema(model, "#/components/schemas/Owner").properties
    expect(getSchema(model, pet!.schema).externalDocs).toEqual(docs("owned"))
  })
})
