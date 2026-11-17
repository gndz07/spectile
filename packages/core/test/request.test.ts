import { describe, expect, it } from "vitest"
import {
  buildRequest,
  exampleFromSchema,
  formatResponseBody,
  missingParameters,
  normalize,
  resolveServerUrl,
  toCurl,
  toCurlTokens,
} from "../src"

const parameter = (name: string, location: string, extra: object = {}) => ({
  name,
  in: location,
  schema: { type: "string" },
  ...extra,
})

const model = normalize({
  openapi: "3.1.0",
  info: { title: "Requests", version: "1.0.0" },
  servers: [{ url: "https://{region}.example.com/v1", variables: { region: { default: "eu" } } }],
  security: [{ key: [] }, { token: [] }],
  paths: {
    "/items/{id}": {
      post: {
        operationId: "update",
        parameters: [
          parameter("id", "path", { required: true }),
          parameter("tags", "query", { schema: { type: "array", items: { type: "string" } } }),
          parameter("ids", "query", { explode: false }),
          parameter("filter", "query", { style: "deepObject" }),
          parameter("X-Trace", "header"),
          parameter("session", "cookie"),
          parameter("next", "query", { allowReserved: true }),
          parameter("Content-Type", "header", { required: true }),
        ],
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/Item" } } },
        },
        responses: { "200": { description: "OK" } },
      },
    },
    "/public": {
      get: { operationId: "open", security: [], responses: { "200": { description: "OK" } } },
    },
  },
  components: {
    securitySchemes: {
      key: { type: "apiKey", in: "header", name: "X-API-Key" },
      token: { type: "http", scheme: "bearer" },
      basic: { type: "http", scheme: "basic" },
    },
    schemas: {
      Item: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", readOnly: true },
          name: { type: "string", examples: ["Lamp"] },
          price: { type: "number", minimum: 1 },
          created: { type: "string", format: "date-time" },
          parent: { $ref: "#/components/schemas/Item" },
          children: { type: "array", items: { $ref: "#/components/schemas/Item" } },
          status: { enum: ["active", "archived"] },
          kind: { oneOf: [{ type: "boolean" }, { type: "string" }] },
          secret: { type: "string", writeOnly: true },
        },
      },
      Combined: {
        allOf: [
          { type: "object", properties: { a: { type: "integer" } } },
          { type: "object", properties: { b: { type: "boolean" } } },
        ],
      },
      Code: { type: "string", enum: ["active", "archived"] },
      Described: { allOf: [{ $ref: "#/components/schemas/Code" }], description: "A code" },
      Choice: {
        type: "object",
        oneOf: [{ type: "object", properties: { meow: { type: "boolean" } } }],
      },
    },
  },
})

const operation = (id: string) => model.operations.find((candidate) => candidate.id === id)!
const update = operation("update")

describe("buildRequest", () => {
  it("serializes path, query, header and cookie parameters", () => {
    const request = buildRequest(model, update, {
      serverUrl: "https://api.example.com/",
      parameters: {
        "path.id": "a b",
        "query.tags": ["x", "y"],
        "query.ids": ["1", "2"],
        "query.filter": { color: "red" },
        "header.X-Trace": "abc",
        "cookie.session": "s1",
      },
    })
    expect(request).toEqual({
      method: "POST",
      url: "https://api.example.com/items/a%20b?tags=x&tags=y&ids=1,2&filter[color]=red",
      headers: { "X-Trace": "abc", Cookie: "session=s1" },
    })
  })

  it("keeps reserved characters for allowReserved and ignores Content-Type header parameters", () => {
    expect(buildRequest(model, update, { parameters: { "query.next": "/a?b" } }).url).toBe(
      "/items/{id}?next=/a?b",
    )
    expect(update.parameters.map(({ name }) => name)).not.toContain("Content-Type")
  })

  it("skips empty values and keeps unfilled path templates", () => {
    const request = buildRequest(model, update, {
      parameters: { "query.tags": [], "header.X-Trace": "" },
    })
    expect(request.url).toBe("/items/{id}")
    expect(request.headers).toEqual({})
    expect(request.placeholders).toEqual(["{id}"])
  })

  it("writes placeholders for missing required parameters and marks them in curl", () => {
    const operation = normalize({
      openapi: "3.1.0",
      info: { title: "Missing", version: "1.0.0" },
      paths: {
        "/users/{user_id}": {
          get: {
            parameters: [
              parameter("user_id", "path", { required: true }),
              parameter("limit", "query", { required: true }),
              parameter("X-Trace", "header", { required: true }),
              parameter("page", "query"),
            ],
            responses: {},
          },
        },
      },
    }).operations[0]!
    const request = buildRequest(model, operation, { parameters: { "header.X-Trace": "t" } })
    expect(request).toMatchObject({
      url: "/users/{user_id}?limit={limit}",
      headers: { "X-Trace": "t" },
      placeholders: ["{user_id}", "{limit}"],
    })
    expect(toCurlTokens(request)).toEqual([
      { text: "curl '/users/" },
      { text: "{user_id}", missing: true },
      { text: "?limit=" },
      { text: "{limit}", missing: true },
      { text: "' \\\n  -H 'X-Trace: t'" },
    ])
    expect(toCurlTokens({ method: "GET", url: "/a", headers: {} })).toEqual([
      { text: "curl '/a'" },
    ])
  })

  it("sends the body with its content type only when there is one", () => {
    const withBody = buildRequest(model, update, { body: "{}", mediaType: "application/json" })
    expect(withBody).toMatchObject({ body: "{}", headers: { "Content-Type": "application/json" } })
    expect(
      buildRequest(model, update, { body: "", mediaType: "application/json" }),
    ).not.toHaveProperty("body")
    expect(buildRequest(model, operation("open"), { body: "{}" })).not.toHaveProperty("body")
  })

  it("encodes a JSON object for form bodies, and sends anything else as typed", () => {
    const fields = JSON.stringify({ name: "a b", tags: ["x", "y"], meta: { k: 1 }, gone: null })
    const send = (body: string, mediaType: string) =>
      buildRequest(model, update, { body, mediaType })
    expect(send(fields, "application/x-www-form-urlencoded")).toMatchObject({
      body: "name=a%20b&tags=x&tags=y&k=1",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })
    expect(send("a=1", "application/x-www-form-urlencoded").body).toBe("a=1")

    const request = send(fields, "multipart/form-data")
    const part = (name: string, value: string) =>
      `--spectile-boundary\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
    expect(request).toMatchObject({
      headers: { "Content-Type": "multipart/form-data; boundary=spectile-boundary" },
      body: `${part("name", "a b")}${part("tags", "x")}${part("tags", "y")}${part("meta", '{"k":1}')}--spectile-boundary--\r\n`,
      form: [
        { name: "name", value: "a b" },
        { name: "tags", value: "x" },
        { name: "tags", value: "y" },
        { name: "meta", value: '{"k":1}' },
      ],
    })
    expect(toCurl(request)).toBe(
      `curl '/items/{id}' \\\n  --form-string 'name=a b' \\\n  --form-string 'tags=x' \\\n  --form-string 'tags=y' \\\n  --form-string 'meta={"k":1}'`,
    )
  })

  it("picks a multipart boundary that no value contains", () => {
    const body = JSON.stringify({ note: "--spectile-boundary" })
    expect(buildRequest(model, update, { body, mediaType: "multipart/form-data" }).headers).toEqual({
      "Content-Type": "multipart/form-data; boundary=spectile-boundary-1",
    })
  })

  it("applies the first security requirement that has credentials", () => {
    const headers = (credentials: Record<string, string>) =>
      buildRequest(model, update, { credentials }).headers
    expect(headers({ key: "k1" })).toEqual({ "X-API-Key": "k1" })
    expect(headers({ token: "t1" })).toEqual({ Authorization: "Bearer t1" })
    expect(headers({ key: "", token: "t1" })).toEqual({ Authorization: "Bearer t1" })
    expect(headers({})).toEqual({})
    expect(buildRequest(model, operation("open"), { credentials: { key: "k1" } }).headers).toEqual(
      {},
    )
  })

  it("encodes HTTP Basic credentials", () => {
    const basic = { ...update, security: [{ schemes: [{ name: "basic", scopes: [] }] }] }
    const { headers } = buildRequest(model, basic, {
      credentials: { basic: { username: "ada", password: "pässword" } },
    })
    expect(headers.Authorization).toBe(`Basic ${Buffer.from("ada:pässword").toString("base64")}`)
  })
})

describe("request helpers", () => {
  it("resolves server variables, preferring given values", () => {
    const [server] = model.servers
    expect(resolveServerUrl(server!)).toBe("https://eu.example.com/v1")
    expect(resolveServerUrl(server!, { region: "us" })).toBe("https://us.example.com/v1")
  })

  it("lists required parameters without a value", () => {
    expect(missingParameters(update).map(({ name }) => name)).toEqual(["id"])
    expect(missingParameters(update, { "path.id": "1" })).toEqual([])
  })

  it("prints a request as curl", () => {
    expect(
      toCurl({ method: "POST", url: "https://x.dev/a", headers: { A: "it's" }, body: '{"a":1}' }),
    ).toBe(`curl 'https://x.dev/a' \\\n  -H 'A: it'\\''s' \\\n  --data-raw '{"a":1}'`)
    expect(toCurl({ method: "PUT", url: "/a", headers: {}, body: "{}" })).toMatch(/^curl -X PUT '\/a'/)
    expect(toCurl({ method: "POST", url: "/a", headers: {} })).toBe("curl -X POST '/a'")
    expect(toCurl({ method: "GET", url: "/a", headers: {}, body: "{}" })).toMatch(/^curl -X GET/)
    expect(toCurl({ method: "POST", url: "/a", headers: {}, body: "@here hi" })).toContain(
      "--data-raw '@here hi'",
    )
  })
})

describe("exampleFromSchema", () => {
  const item = { pointer: "#/components/schemas/Item", circular: false }

  it("builds a value from examples, formats, enums and types, stopping at cycles", () => {
    expect(exampleFromSchema(model, item)).toEqual({
      name: "Lamp",
      price: 1,
      created: "2024-05-14T09:30:00Z",
      children: [],
      status: "active",
      kind: true,
      secret: "text",
    })
  })

  it("picks a value from the property name when nothing else gives one", () => {
    const named = normalize({
      openapi: "3.1.0",
      info: { title: "Named", version: "1" },
      paths: {},
      components: {
        schemas: {
          User: {
            type: "object",
            properties: Object.fromEntries(
              ["id", "user_id", "fullName", "first_name", "username", "email", "nickname"].map(
                (name) => [name, { type: "string" }],
              ),
            ),
          },
        },
      },
    })
    expect(
      exampleFromSchema(named, { pointer: "#/components/schemas/User", circular: false }),
    ).toEqual({
      id: "usr_8f2k1q",
      user_id: "usr_8f2k1q",
      fullName: "Ada Lovelace",
      first_name: "Ada",
      username: "ada",
      email: "ada@example.com",
      nickname: "text",
    })
  })

  it("leaves out writeOnly properties in responses instead of readOnly ones", () => {
    const response = exampleFromSchema(model, item, { usage: "response" })
    expect(response).toMatchObject({ id: "3fa85f64-5717-4562-b3fc-2c963f66afa6" })
    expect(response).not.toHaveProperty("secret")
  })

  it("merges allOf parts", () => {
    expect(
      exampleFromSchema(model, { pointer: "#/components/schemas/Combined", circular: false }),
    ).toEqual({ a: 0, b: true })
  })

  it("keeps a non-object allOf part, and uses the first choice of an object without properties", () => {
    const of = (name: string) =>
      exampleFromSchema(model, { pointer: `#/components/schemas/${name}`, circular: false })
    expect(of("Described")).toBe("active")
    expect(of("Choice")).toEqual({ meow: true })
  })
})

describe("formatResponseBody", () => {
  it("pretty-prints JSON and leaves everything else alone", () => {
    expect(formatResponseBody('{"a":1}', "application/problem+json")).toBe('{\n  "a": 1\n}')
    expect(formatResponseBody("{oops", "application/json")).toBe("{oops")
    expect(formatResponseBody('{"a":1}', "text/plain")).toBe('{"a":1}')
  })

  it("only adds whitespace, so numbers, duplicate keys and strings stay as sent", () => {
    const body = '{"id":9007199254740993,"price":1.10,"a":1,"a":2,"s":"x,\\"{y}:","e":[],"o":{ }}'
    expect(formatResponseBody(body, "application/json")).toBe(
      [
        "{",
        '  "id": 9007199254740993,',
        '  "price": 1.10,',
        '  "a": 1,',
        '  "a": 2,',
        '  "s": "x,\\"{y}:",',
        '  "e": [],',
        '  "o": {}',
        "}",
      ].join("\n"),
    )
  })
})
