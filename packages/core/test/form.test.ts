import { describe, expect, it } from "vitest"
import { bodyFields, buildRequest, fieldExamples, normalize, toCurl } from "../src"

const model = normalize({
  openapi: "3.1.0",
  info: { title: "Forms", version: "1.0.0" },
  paths: {
    "/upload": {
      post: {
        operationId: "upload",
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: { $ref: "#/components/schemas/Upload" },
              encoding: {
                meta: {
                  contentType: "application/json",
                  headers: { "X-Part": { schema: { type: "string" } } },
                },
                photos: { contentType: "image/png, image/jpeg" },
                raw: { contentType: "application/octet-stream" },
              },
            },
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  ids: { type: "array", items: { type: "string" } },
                  next: { type: "string" },
                },
              },
              encoding: { ids: { explode: false }, next: { allowReserved: true } },
            },
            "application/json": { schema: { $ref: "#/components/schemas/Upload" } },
          },
        },
        responses: {},
      },
    },
  },
  components: {
    schemas: {
      Upload: {
        allOf: [{ $ref: "#/components/schemas/Base" }],
        required: ["photo"],
        properties: {
          photo: { type: "string", format: "binary" },
          photos: { type: "array", items: { type: "string", contentMediaType: "image/*" } },
          raw: {},
          meta: { type: "object", properties: { a: { type: "integer" } } },
          note: { type: "string", examples: ["hi"] },
          id: { type: "string", readOnly: true },
        },
      },
      Base: { type: "object", properties: { owner: { type: "string" } } },
    },
  },
})

const upload = model.operations[0]!
const [multipart, urlencoded, json] = upload.requestBody!.content

describe("form bodies", () => {
  it("normalizes the encoding object", () => {
    expect(multipart!.encoding).toMatchObject({
      meta: { contentType: "application/json", headers: [{ name: "X-Part", required: false }] },
      photos: { contentType: "image/png, image/jpeg", headers: [] },
    })
    expect(json).not.toHaveProperty("encoding")
  })

  it("lists one field per property, with files from binary schemas and encodings", () => {
    expect(
      bodyFields(model, multipart!).map(({ name, required, file, multiple, accept }) => [
        name,
        required,
        file,
        multiple,
        accept,
      ]),
    ).toEqual([
      ["owner", false, false, false, undefined],
      ["photo", true, true, false, undefined],
      ["photos", false, true, true, "image/png, image/jpeg"],
      ["raw", false, true, false, "application/octet-stream"],
      ["meta", false, false, false, undefined],
      ["note", false, false, false, undefined],
    ])
    expect(bodyFields(model, urlencoded!).map(({ name, file }) => [name, file])).toEqual([
      ["ids", false],
      ["next", false],
    ])
    expect(bodyFields(model, json!)).toEqual([])
  })

  it("fills typed fields from the example", () => {
    expect(fieldExamples(model, multipart!)).toEqual({
      owner: "text",
      meta: '{"a":0}',
      note: "hi",
    })
  })

  it("applies the encoding's style to urlencoded fields", () => {
    const { body } = buildRequest(model, upload, {
      mediaType: "application/x-www-form-urlencoded",
      body: { ids: ["1", "2"], next: "/a?b=c" },
    })
    expect(body).toBe("ids=1,2&next=/a?b=c")
  })

  it("sends files and typed parts with their content types", () => {
    const photo = new File(["PNG"], "me.png", { type: "image/png" })
    const raw = new File(["x"], "x.bin")
    const request = buildRequest(model, upload, {
      mediaType: "multipart/form-data",
      body: { photo, raw, meta: { a: 1 } },
    })
    const head = (name: string, file: string, type: string) =>
      `--spectile-boundary\r\nContent-Disposition: form-data; name="${name}"${file}\r\nContent-Type: ${type}\r\n\r\n`
    expect(request.body).toEqual([
      head("photo", '; filename="me.png"', "image/png"),
      photo,
      "\r\n",
      head("raw", '; filename="x.bin"', "application/octet-stream"),
      raw,
      "\r\n",
      head("meta", "", "application/json"),
      '{"a":1}',
      "\r\n",
      "--spectile-boundary--\r\n",
    ])
    expect(request.form).toEqual([
      { name: "photo", value: photo, contentType: "image/png" },
      { name: "raw", value: raw, contentType: "application/octet-stream" },
      { name: "meta", value: '{"a":1}', contentType: "application/json" },
    ])
    expect(toCurl(request)).toBe(
      `curl '/upload' \\\n  -F 'photo=@"me.png";type=image/png' \\\n  -F 'raw=@"x.bin";type=application/octet-stream' \\\n  -F 'meta="{\\"a\\":1}";type=application/json'`,
    )
  })

  it("sends values as JSON for other media types, and no body when every field is empty", () => {
    expect(
      buildRequest(model, upload, { mediaType: "application/json", body: { a: 1 } }).body,
    ).toBe('{"a":1}')
    expect(
      buildRequest(model, upload, { mediaType: "multipart/form-data", body: {} }),
    ).not.toHaveProperty("body")
  })
})
