import { getSchema, normalize } from "@spectile/core"
import { describe, expect, it } from "vitest"
import { typeLabel } from "../src/labels"

const model = normalize({
  openapi: "3.1.0",
  info: { title: "Labels", version: "1.0.0" },
  components: {
    schemas: {
      User: { type: "object" },
      Users: { type: "array", items: { $ref: "#/components/schemas/User" } },
      Tags: { type: "array", items: { type: "string" } },
      Notes: { type: "array", items: { type: ["string", "null"] } },
      Ids: { type: "array", items: { type: "string", format: "uuid" } },
      Email: { type: ["string", "null"], format: "email" },
      Pet: { oneOf: [{ type: "string" }, { type: "integer" }] },
      Anything: {},
      Kind: { const: "cat" },
      Sizes: { enum: [1, 2, null] },
    },
  },
})

const label = (name: string) =>
  typeLabel(model, { ...getSchema(model, `#/components/schemas/${name}`), refName: undefined })

describe("typeLabel", () => {
  it("names types in plain words", () => {
    expect(label("Users")).toBe("array of User")
    expect(label("Tags")).toBe("array of string")
    expect(label("Notes")).toBe("array of (string or null)")
    expect(label("Ids")).toBe("array of (string · uuid)")
    expect(label("Email")).toBe("string or null · email")
    expect(label("Pet")).toBe("one of")
    expect(label("Anything")).toBe("any")
    expect(label("Kind")).toBe("string")
    expect(label("Sizes")).toBe("integer or null")
    expect(typeLabel(model, getSchema(model, "#/components/schemas/User"))).toBe("User")
  })
})
