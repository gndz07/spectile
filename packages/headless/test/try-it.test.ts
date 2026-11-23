import { describe, expect, it, vi } from "vitest"
import {
  type FetchLike,
  type OperationTryIt,
  type ResponseLike,
  createTryIt,
  defaultExampleResponse,
  formatBytes,
  formatDuration,
} from "../src"
import { defaultStorageKey } from "../src/try-it/storage"
import { formModel, model, serversModel } from "./fixture"

const response = (
  body: string,
  status = 200,
  headers: Record<string, string> = { "content-type": "application/json" },
): ResponseLike => ({
  status,
  statusText: status === 200 ? "OK" : "Not Found",
  headers: {
    forEach: (callback) => Object.entries(headers).forEach(([key, value]) => callback(value, key)),
  },
  text: async () => body,
  blob: async () => new Blob([body]),
})

const deferred = () => {
  let resolve: (value: ResponseLike) => void = () => {}
  const promise = new Promise<ResponseLike>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

const setup = (fetch: FetchLike = vi.fn<FetchLike>(async () => response('{"name":"Rex"}'))) => {
  const tryIt = createTryIt(model, { fetch })
  return { tryIt, fetch, getPet: tryIt.forOperation("getPet") }
}

describe("createTryIt", () => {
  it("starts from examples and the first server", () => {
    const { tryIt, getPet } = setup()
    expect(getPet.getSnapshot().serverUrl).toBe("https://api.example.com/v1")
    expect(getPet.getSnapshot().draft.parameters).toEqual({
      "path.id": "",
      "query.fields": "name,age",
    })
    const { draft } = tryIt.forOperation("createUser").getSnapshot()
    expect(draft.mediaType).toBe("application/json")
    expect(JSON.parse(draft.body)).toEqual({
      name: "Ada Lovelace",
      friends: [],
      profile: { bio: "text" },
    })
  })

  it("builds the request from the draft, server and credentials", () => {
    const { tryIt, getPet } = setup()
    getPet.setParameter("path.id", "7")
    tryIt.setCredential("apiKey", "secret")
    expect(getPet.getSnapshot().request).toEqual({
      method: "GET",
      url: "https://api.example.com/v1/pets/7?fields=name&fields=age",
      headers: { "X-API-Key": "secret" },
    })
    const health = tryIt.forOperation("health")
    health.setServerUrl("http://localhost:3000")
    expect(health.getSnapshot().request).toMatchObject({
      url: "http://localhost:3000/health",
      headers: {},
    })
  })

  it("refuses to send without required parameters", async () => {
    const { fetch, getPet } = setup()
    await getPet.send()
    expect(fetch).not.toHaveBeenCalled()
    expect(getPet.getSnapshot().result).toEqual({
      status: "error",
      error: "Missing required parameters: id",
    })
  })

  it("sends the request and records the response", async () => {
    const { fetch, getPet } = setup()
    getPet.setParameter("path.id", "7")
    const sending = getPet.send()
    expect(getPet.getSnapshot().result.status).toBe("pending")
    expect(getPet.getSendProps()).toEqual({ type: "submit", disabled: true, "aria-busy": true })
    await sending
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/v1/pets/7?fields=name&fields=age",
      expect.objectContaining({ method: "GET", headers: {}, signal: expect.anything() }),
    )
    expect(getPet.getSnapshot().result).toMatchObject({
      status: "done",
      response: {
        status: 200,
        statusText: "OK",
        headers: { "content-type": "application/json" },
        body: '{\n  "name": "Rex"\n}',
      },
    })
  })

  it("lowercases header names and keeps binary bodies as a Blob", async () => {
    const { getPet } = setup(async () => response("PNG", 200, { "Content-Type": "image/png" }))
    getPet.setParameter("path.id", "7")
    await getPet.send()
    const { result } = getPet.getSnapshot()
    const done = result.status === "done" ? result.response : undefined
    expect(done).toMatchObject({ headers: { "content-type": "image/png" }, body: "" })
    expect(await done?.blob?.text()).toBe("PNG")
  })

  it("refuses to send an empty required body", async () => {
    const fetch = vi.fn<FetchLike>()
    const required = {
      ...model,
      operations: model.operations.map((operation) =>
        operation.requestBody
          ? { ...operation, requestBody: { ...operation.requestBody, required: true } }
          : operation,
      ),
    }
    const create = createTryIt(required, { fetch }).forOperation("createUser")
    create.setBody("")
    expect(create.getSnapshot().missingBody).toBe(true)
    await create.send()
    expect(fetch).not.toHaveBeenCalled()
    expect(create.getSnapshot().result).toEqual({ status: "error", error: "Missing required body" })
  })

  it("stops a pending request when a new send is refused", async () => {
    const pending = deferred()
    const { getPet } = setup(() => pending.promise)
    getPet.setParameter("path.id", "7")
    const first = getPet.send()
    getPet.setParameter("path.id", "")
    await getPet.send()
    pending.resolve(response("{}"))
    await first
    expect(getPet.getSnapshot().result).toEqual({
      status: "error",
      error: "Missing required parameters: id",
    })
  })

  it("explains network failures", async () => {
    const { getPet } = setup(async () => {
      throw new TypeError("Failed to fetch")
    })
    getPet.setParameter("path.id", "7")
    await getPet.send()
    const { result } = getPet.getSnapshot()
    expect(result.status === "error" && result.error).toMatch(/^Failed to fetch\. .*CORS/)
    expect(result).toMatchObject({ network: true })
  })

  it("records the body's size in bytes", async () => {
    const { getPet } = setup(async () => response('{"name":"Rëx"}'))
    getPet.setParameter("path.id", "7")
    await getPet.send()
    expect(getPet.getSnapshot().result).toMatchObject({ response: { size: 15 } })
  })

  it("formats sizes and durations", () => {
    expect([0, 512, 1536, 2 * 1024 ** 2].map(formatBytes)).toEqual([
      "0 B",
      "512 B",
      "1.5 KB",
      "2 MB",
    ])
    expect([85.4, 1234].map(formatDuration)).toEqual(["85 ms", "1.2 s"])
  })

  it("switches the content type through select props", () => {
    const create = setup().tryIt.forOperation("createUser")
    expect(create.getMediaTypeSelectProps()).toMatchObject({ value: "application/json" })
    create.getMediaTypeSelectProps().onChange({ currentTarget: { value: "text/plain" } })
    expect(create.getSnapshot().draft.mediaType).toBe("text/plain")
  })

  it("shows the first successful response with a body in the example panel", () => {
    const listUsers = model.operations.find(({ id }) => id === "listUsers")!
    const health = model.operations.find(({ id }) => id === "health")!
    expect(defaultExampleResponse(listUsers)?.status).toBe("200")
    expect(defaultExampleResponse(health)?.status).toBe("204")
    const empty = { pointer: "", description: "", content: [], headers: [] }
    const { content } = listUsers.responses[0]!
    const responses = [
      { ...empty, status: "201" },
      { ...empty, status: "4XX", content },
    ]
    expect(defaultExampleResponse({ ...listUsers, responses })?.status).toBe("4XX")
  })

  it("ignores the response of a cancelled request", async () => {
    const pending = deferred()
    const { getPet } = setup(() => pending.promise)
    getPet.setParameter("path.id", "7")
    const sending = getPet.send()
    getPet.cancel()
    pending.resolve(response("{}"))
    await sending
    expect(getPet.getSnapshot().result).toEqual({ status: "idle" })
  })

  it("keeps a draft per operation until it is reset", () => {
    const { tryIt, getPet } = setup()
    const health = tryIt.forOperation("health")
    const before = health.getSnapshot()
    getPet.setParameter("path.id", "7")
    expect(health.getSnapshot()).toBe(before)
    expect(tryIt.forOperation("getPet")).toBe(getPet)
    getPet.reset()
    expect(getPet.getSnapshot().draft.parameters["path.id"]).toBe("")
  })

  it("doesn't notify subscribers when nothing changes", () => {
    const { tryIt, getPet } = setup()
    getPet.setParameter("path.id", "7")
    tryIt.setCredential("basic", { username: "ada", password: "pw" })
    const listener = vi.fn()
    tryIt.subscribe(listener)
    getPet.setParameter("path.id", "7")
    getPet.selectServer(0)
    getPet.cancel()
    tryIt.forOperation("health").reset()
    tryIt.forOperation("createUser").setMediaType("application/json")
    tryIt.setCredential("apiKey", undefined)
    tryIt.getCredentialProps("basic", "username").onChange({ currentTarget: { value: "ada" } })
    expect(listener).not.toHaveBeenCalled()
  })

  it("gives props for form fields", () => {
    const { tryIt, getPet } = setup()
    const [id] = model.operations.find((operation) => operation.id === "getPet")!.parameters
    getPet.getParameterProps(id!).onChange({ currentTarget: { value: "9" } })
    expect(getPet.getParameterProps(id!)).toMatchObject({
      name: "path.id",
      value: "9",
      required: true,
    })

    tryIt.getCredentialProps("basic", "username").onChange({ currentTarget: { value: "ada" } })
    tryIt.getCredentialProps("basic", "password").onChange({ currentTarget: { value: "pw" } })
    expect(tryIt.getSnapshot().credentials).toEqual({ basic: { username: "ada", password: "pw" } })
    expect(tryIt.getCredentialProps("basic", "password").value).toBe("pw")

    const preventDefault = vi.fn()
    getPet.getFormProps().onSubmit({ preventDefault })
    expect(preventDefault).toHaveBeenCalled()
  })

  it("rejects unknown operations", () => {
    expect(() => setup().tryIt.forOperation("nope")).toThrow("Unknown operation nope")
  })
})

describe("form bodies", () => {
  const setup = () => {
    const fetch = vi.fn<FetchLike>(async () => response("{}"))
    return { fetch, upload: createTryIt(formModel, { fetch }).forOperation("upload") }
  }
  const photo = new File(["PNG"], "me.png", { type: "image/png" })

  it("has one field per property, filled in from the example", () => {
    const { upload } = setup()
    const { bodyFields, draft } = upload.getSnapshot()
    expect(bodyFields.map(({ name, file, multiple, accept }) => [name, file, multiple, accept])).toEqual(
      [
        ["photo", true, false, "image/png"],
        ["extras", true, true, "image/*"],
        ["caption", false, false, undefined],
        ["tags", false, true, undefined],
      ],
    )
    expect(draft.fields).toEqual({ caption: "Me", tags: "text" })
    expect(upload.getFieldProps(bodyFields[2]!)).toMatchObject({ name: "body.caption", value: "Me" })
  })

  it("refuses to send without required fields", async () => {
    const { fetch, upload } = setup()
    await upload.send()
    expect(fetch).not.toHaveBeenCalled()
    expect(upload.getSnapshot().result).toEqual({
      status: "error",
      error: "Missing required fields: photo",
    })
  })

  it("sends chosen files and typed fields as multipart", async () => {
    const { fetch, upload } = setup()
    const props = upload.getFieldProps(upload.getSnapshot().bodyFields[0]!)
    expect(props).toMatchObject({ name: "body.photo", type: "file", accept: "image/png", required: true })
    if (props.type === "file") props.onChange({ currentTarget: { files: [photo] } })
    upload.setField("tags", "a, b")
    await upload.send()

    const { request } = upload.getSnapshot()
    expect(request.headers).toEqual({
      "Content-Type": "multipart/form-data; boundary=spectile-boundary",
    })
    expect(request.form).toEqual([
      { name: "photo", value: photo, contentType: "image/png" },
      { name: "caption", value: "Me" },
      { name: "tags", value: "a" },
      { name: "tags", value: "b" },
    ])
    const sent = await (fetch.mock.calls[0]![1].body as Blob).text()
    expect(sent).toContain(
      'name="photo"; filename="me.png"\r\nContent-Type: image/png\r\n\r\nPNG\r\n--spectile-boundary\r\n',
    )
  })

  it("switches to the fields of another media type", () => {
    const { upload } = setup()
    upload.setMediaType("application/x-www-form-urlencoded")
    const { bodyFields, draft } = upload.getSnapshot()
    expect(bodyFields.map(({ name }) => name)).toEqual(["q", "ids"])
    expect(draft.fields).toEqual({ q: "text", ids: "text" })
    upload.setField("ids", "1,2")
    expect(upload.getSnapshot().request.body).toBe("q=text&ids=1,2")
  })
})

describe("servers", () => {
  const setup = (baseUrl?: string) => {
    const tryIt = createTryIt(serversModel, { baseUrl })
    return {
      pets: tryIt.forOperation("listPets"),
      users: tryIt.forOperation("listUsers"),
      upload: tryIt.forOperation("upload"),
    }
  }
  const urlOf = (session: OperationTryIt) => session.getSnapshot().request.url

  it("uses each operation's own servers", () => {
    const { pets, upload } = setup("https://docs.example.com/spec.json")
    expect(urlOf(pets)).toBe("https://api.example.com/pets")
    expect(urlOf(upload)).toBe("https://docs.example.com/uploads/files")
  })

  it("shares the chosen server between operations with the same servers", () => {
    const { pets, users, upload } = setup()
    pets.getServerSelectProps().onChange({ currentTarget: { value: "1" } })
    expect(users.getSnapshot()).toMatchObject({
      serverIndex: 1,
      serverVariables: { region: "eu", version: "v1" },
      serverUrl: "https://eu.example.com/v1",
    })
    expect(urlOf(upload)).toBe("/uploads/files")
    expect(pets.getServerSelectProps().value).toBe("1")
  })

  it("fills in server variables", () => {
    const { pets } = setup()
    pets.selectServer(1)
    pets.getServerVariableProps("region").onChange({ currentTarget: { value: "us" } })
    expect(pets.getServerVariableProps("region")).toMatchObject({
      name: "server.region",
      value: "us",
    })
    expect(urlOf(pets)).toBe("https://us.example.com/v1/pets")
    pets.selectServer(0)
    pets.selectServer(1)
    expect(urlOf(pets)).toBe("https://eu.example.com/v1/pets")
  })

  it("lets a typed URL win until another server or variable is chosen", () => {
    const { pets } = setup()
    pets.selectServer(1)
    pets.getServerProps().onChange({ currentTarget: { value: "http://localhost:8080" } })
    expect(urlOf(pets)).toBe("http://localhost:8080/pets")
    pets.setServerVariable("region", "us")
    expect(urlOf(pets)).toBe("https://us.example.com/v1/pets")
  })

  it("sends to the chosen server while the typed URL is blank", () => {
    const { pets } = setup()
    expect(pets.getSnapshot().typedServerUrl).toBeUndefined()
    pets.getServerProps().onChange({ currentTarget: { value: " " } })
    expect(pets.getSnapshot()).toMatchObject({
      typedServerUrl: " ",
      serverUrl: "https://api.example.com",
    })
    expect(pets.getServerProps().value).toBe(" ")
    expect(urlOf(pets)).toBe("https://api.example.com/pets")
    pets.selectServer(0)
    expect(pets.getSnapshot().typedServerUrl).toBeUndefined()
  })
})

describe("credential storage", () => {
  const memoryStorage = (entries: Record<string, string> = {}) => {
    const items = new Map(Object.entries(entries))
    return {
      items,
      getItem: (key: string) => items.get(key) ?? null,
      setItem: vi.fn((key: string, value: string) => void items.set(key, value)),
      removeItem: (key: string) => void items.delete(key),
    }
  }

  it("keeps credentials across instances", () => {
    const storage = memoryStorage()
    const first = createTryIt(model, { storage })
    first.setCredential("apiKey", "secret")
    first.setCredential("basic", { username: "ada", password: "pw" })
    const second = createTryIt(model, { storage })
    expect(second.getSnapshot().credentials).toEqual({
      apiKey: "secret",
      basic: { username: "ada", password: "pw" },
    })
    second.setCredential("apiKey", undefined)
    expect(createTryIt(model, { storage }).getSnapshot().credentials).toEqual({
      basic: { username: "ada", password: "pw" },
    })
  })

  it("keys storage by the spec's title and servers unless given a key", () => {
    const storage = memoryStorage()
    createTryIt(model, { storage }).setCredential("apiKey", "a")
    createTryIt(model, { storage, storageKey: "mine" }).setCredential("apiKey", "b")
    expect(defaultStorageKey(model)).toMatch(new RegExp(`^spectile:credentials:${model.info.title}:`))
    expect(storage.items.get(defaultStorageKey(model))).toBe('{"apiKey":"a"}')
    expect(storage.items.get("mine")).toBe('{"apiKey":"b"}')
    const staging = { ...model, servers: [{ url: "https://staging.example.com", variables: {} }] }
    expect(defaultStorageKey(staging)).not.toBe(defaultStorageKey(model))
  })

  it("writes nothing until a credential is entered, and removes the entry with the last one", () => {
    const storage = memoryStorage()
    const tryIt = createTryIt(model, { storage })
    expect(storage.setItem).not.toHaveBeenCalled()
    tryIt.setCredential("apiKey", "secret")
    expect(storage.items.size).toBe(1)
    tryIt.setCredential("apiKey", undefined)
    expect(storage.items.size).toBe(0)
  })

  it("ignores broken or blocked storage", () => {
    const broken = memoryStorage({ key: '{"apiKey":1,"basic":{"username":"x"},"token":"t"}' })
    expect(createTryIt(model, { storage: broken, storageKey: "key" }).getSnapshot().credentials).toEqual({ token: "t" })
    const blocked = {
      getItem: () => {
        throw new Error("blocked")
      },
      setItem: () => {
        throw new Error("blocked")
      },
    }
    const tryIt = createTryIt(model, { storage: blocked })
    tryIt.setCredential("apiKey", "secret")
    expect(tryIt.getSnapshot().credentials).toEqual({ apiKey: "secret" })
  })

  it("writes only when credentials change", () => {
    const storage = memoryStorage()
    const tryIt = createTryIt(model, { storage })
    const getPet = tryIt.forOperation("getPet")
    getPet.setParameter("path.id", "7")
    expect(storage.setItem).not.toHaveBeenCalled()
    tryIt.setCredential("apiKey", "secret")
    expect(storage.setItem).toHaveBeenCalledTimes(1)
  })
})
