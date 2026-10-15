import { describe, expect, it } from "vitest"
import { getSchema, normalize, type SchemaNode } from "../src"
import { loadFixture } from "./load-fixture"

const property = (node: SchemaNode, name: string) => {
  const found = node.properties.find((candidate) => candidate.name === name)
  if (!found) throw new Error(`No property ${name}`)
  return found
}

describe("circular schemas", () => {
  const model = normalize(loadFixture("circular.json"))
  const user = getSchema(model, "#/components/schemas/User")

  it("marks schemas that reach themselves as circular", () => {
    expect(user).toMatchObject({ refName: "User", circular: true, types: ["object"] })
    const friends = getSchema(model, property(user, "friends").schema.pointer)
    expect(friends.items).toEqual({
      pointer: "#/components/schemas/User",
      refName: "User",
      circular: true,
    })
  })

  it("does not mark acyclic schemas as circular", () => {
    expect(property(user, "profile").schema).toEqual({
      pointer: "#/components/schemas/Profile",
      refName: "Profile",
      circular: false,
    })
  })

  it("keeps the model and schema nodes serializable", () => {
    expect(() => JSON.stringify(model)).not.toThrow()
    expect(() => JSON.stringify(user)).not.toThrow()
  })
})

describe("schema nodes", () => {
  const model = normalize(loadFixture("refs.json"))

  it("adds null to the types of nullable schemas", () => {
    const nullable = normalize(loadFixture("nullable.json"))
    expect(getSchema(nullable, "#/components/schemas/Nickname").types).toEqual(["string", "null"])
  })

  it("follows chains of references", () => {
    expect(getSchema(model, "#/components/schemas/Alias")).toMatchObject({
      pointer: "#/components/schemas/Profile",
      refName: "Profile",
    })
  })

  it("applies annotations written next to a $ref over the target's", () => {
    const { schema } = property(getSchema(model, "#/components/schemas/Owner"), "profile")
    expect(schema).toMatchObject({
      pointer: "#/components/schemas/Profile",
      annotations: {
        description: "The owner's profile",
        deprecated: true,
        examples: [{ bio: "Hi" }],
      },
    })
    expect(getSchema(model, schema)).toMatchObject({
      refName: "Profile",
      description: "The owner's profile",
      deprecated: true,
      examples: [{ bio: "Hi" }],
      types: ["object"],
    })
    expect(getSchema(model, schema.pointer).description).toBe("A user profile")
  })

  it("lets the outermost $ref's annotations win along a chain", () => {
    expect(getSchema(model, "#/components/schemas/Described").description).toBe("Outer wins")
  })

  it("treats a $ref with keywords of its own as that schema plus allOf the target", () => {
    const extended = getSchema(model, "#/components/schemas/Extended")
    const profile = getSchema(model, property(extended, "profile").schema)
    expect(profile).toMatchObject({
      pointer: "#/components/schemas/Extended/properties/profile",
      refName: undefined,
      types: ["object"],
      description: "A profile with an age",
      properties: [{ name: "age", required: true }],
      allOf: [{ pointer: "#/components/schemas/Profile", refName: "Profile" }],
    })
  })

  it("overrides the description of referenced parameters and responses", () => {
    const [operation] = model.operations
    expect(operation?.parameters[0]).toMatchObject({ name: "id", description: "The profile's id" })
    expect(operation?.responses[0]?.description).toBe("The profile")
  })

  it("leaves inline schemas unnamed", () => {
    const profile = getSchema(model, "#/components/schemas/Profile")
    expect(property(profile, "bio").schema.refName).toBeUndefined()
  })

  it("reports unresolvable references instead of throwing", () => {
    const broken = getSchema(model, "#/components/schemas/Broken")
    const missing = getSchema(model, property(broken, "missing").schema.pointer)
    expect(missing).toMatchObject({ types: [], issue: { code: "unresolved-ref" } })
  })

  it("resolves discriminator mappings given as pointers or names", () => {
    expect(getSchema(model, "#/components/schemas/Pet").discriminator).toEqual({
      propertyName: "kind",
      mapping: {
        cat: { pointer: "#/components/schemas/Cat", refName: "Cat", circular: false },
        dog: { pointer: "#/components/schemas/Dog", refName: "Dog", circular: false },
      },
    })
  })
})
