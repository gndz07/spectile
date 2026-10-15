import { describe, expect, it, vi } from "vitest"
import { type FetchLike, type OperationTryIt, type ResponseLike, createTryIt } from "../src"
import { model, serversModel } from "./fixture"

const response = (body: string, status = 200): ResponseLike => {
  const headers = { "content-type": "application/json" }
  return {
    status,
    statusText: status === 200 ? "OK" : "Not Found",
    headers: {
      forEach: (callback) =>
        Object.entries(headers).forEach(([key, value]) => callback(value, key)),
    },
    text: async () => body,
  }
}

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
      name: "string",
      friends: [],
      profile: { bio: "string" },
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

  it("explains network failures", async () => {
    const { getPet } = setup(async () => {
      throw new TypeError("Failed to fetch")
    })
    getPet.setParameter("path.id", "7")
    await getPet.send()
    const { result } = getPet.getSnapshot()
    expect(result.status === "error" && result.error).toMatch(/^Failed to fetch\. .*CORS/)
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
})
