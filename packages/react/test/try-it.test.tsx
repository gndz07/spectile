import type { FetchLike } from "@spectile/headless"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { formModel, model, operation, serversModel } from "../../headless/test/fixture"
import { Operation, SpectileProvider, TryIt, useTryItContext } from "../src"

const fetch = vi.fn<FetchLike>(async () => ({
  status: 200,
  statusText: "OK",
  headers: { forEach: (callback) => callback("application/json", "content-type") },
  text: async () => '{"name":"Rex"}',
}))

const renderTryIt = (operationId: string) => {
  const operation = model.operations.find((candidate) => candidate.id === operationId)!
  return render(
    <SpectileProvider model={model} tryItOptions={{ fetch }}>
      <TryIt.Credential scheme="apiKey" aria-label="API key" />
      <Operation.Root operation={operation}>
        <TryIt.Root data-testid="form">
          {operation.parameters.map((parameter) => (
            <TryIt.Parameter
              key={parameter.name}
              parameter={parameter}
              aria-label={parameter.name}
            />
          ))}
          <TryIt.Body aria-label="Body" />
          <TryIt.Send>Send</TryIt.Send>
          <TryIt.Status data-testid="status" />
          <TryIt.ResponseBody data-testid="body" />
          <TryIt.Error />
          <TryIt.Curl data-testid="curl" />
        </TryIt.Root>
      </Operation.Root>
    </SpectileProvider>,
  )
}

describe("TryIt primitives", () => {
  it("sends the request and shows the response", async () => {
    renderTryIt("getPet")
    fireEvent.change(screen.getByLabelText("API key"), { target: { value: "k1" } })
    fireEvent.change(screen.getByLabelText("id"), { target: { value: "7" } })
    expect(screen.getByLabelText("fields")).toHaveProperty("value", "name,age")
    expect(screen.getByTestId("curl").textContent).toContain("-H 'X-API-Key: k1'")
    expect(screen.queryByLabelText("Body")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Send" }))
    const status = await screen.findByTestId("status")
    expect(status.textContent).toBe("200 OK")
    expect(status.dataset).toMatchObject({ status: "200", ok: "" })
    expect(screen.getByTestId("body").textContent).toBe('{\n  "name": "Rex"\n}')
    expect(screen.getByTestId("form").dataset.state).toBe("done")
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/v1/pets/7?fields=name&fields=age",
      expect.objectContaining({ headers: { "X-API-Key": "k1" } }),
    )
  })

  it("marks missing values in curl and shows the response's time and size", async () => {
    render(
      <SpectileProvider model={model} tryItOptions={{ fetch }}>
        <Operation.Root operation={operation("getPet")}>
          <TryIt.Root>
            <TryIt.Parameter parameter={operation("getPet").parameters[0]!} aria-label="id" />
            <TryIt.Curl data-testid="curl" />
            <TryIt.Send>Send</TryIt.Send>
            <TryIt.Duration data-testid="duration" />
            <TryIt.Size data-testid="size" />
          </TryIt.Root>
        </Operation.Root>
      </SpectileProvider>,
    )
    const missing = screen.getByTestId("curl").querySelector("[data-missing]")
    expect(missing?.textContent).toBe("{id}")
    fireEvent.change(screen.getByLabelText("id"), { target: { value: "7" } })
    expect(screen.getByTestId("curl").querySelector("[data-missing]")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Send" }))
    expect((await screen.findByTestId("size")).textContent).toBe("14 B")
    expect(screen.getByTestId("duration").textContent).toMatch(/^\d+ ms$/)
  })

  it("cancels a pending request and flags network failures", async () => {
    let fail: (error: Error) => void = () => {}
    const pending = vi.fn<FetchLike>(
      () =>
        new Promise((_, reject) => {
          fail = reject
        }),
    )
    render(
      <SpectileProvider model={model} tryItOptions={{ fetch: pending }}>
        <Operation.Root operation={operation("health")}>
          <TryIt.Root>
            <TryIt.Send>Send</TryIt.Send>
            <TryIt.Cancel>Cancel</TryIt.Cancel>
            <TryIt.Error data-testid="error" />
          </TryIt.Root>
        </Operation.Root>
      </SpectileProvider>,
    )
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Send" }))
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }))
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Send" }))
    await screen.findByRole("button", { name: "Cancel" })
    await act(async () => fail(new TypeError("Failed to fetch")))
    expect(screen.getByTestId("error").dataset.network).toBe("")
  })

  it("shows a security scheme's description", () => {
    const described = {
      ...model,
      securitySchemes: model.securitySchemes.map((scheme) => ({
        ...scheme,
        description: "Your _key_",
      })),
    }
    render(
      <SpectileProvider model={described}>
        <TryIt.CredentialDescription scheme="apiKey" data-testid="description" />
        <TryIt.CredentialDescription scheme="missing" data-testid="none" />
      </SpectileProvider>,
    )
    expect(screen.getByTestId("description").textContent).toBe("Your _key_")
    expect(screen.queryByTestId("none")).toBeNull()
  })

  it("leaves required parameters to form validation", () => {
    fetch.mockClear()
    renderTryIt("getPet")
    expect(screen.getByLabelText("id")).toHaveProperty("required", true)
    fireEvent.click(screen.getByRole("button", { name: "Send" }))
    expect(fetch).not.toHaveBeenCalled()
  })

  it("reports missing required parameters when the form skips validation", () => {
    renderTryIt("getPet")
    fireEvent.submit(screen.getByTestId("form"))
    expect(screen.getByRole("alert").textContent).toBe("Missing required parameters: id")
  })

  it("picks a server and fills in its variables", () => {
    const ServerFields = ({ operationId }: { operationId: string }) => (
      <Operation.Root operation={serversModel.operations.find(({ id }) => id === operationId)!}>
        <TryIt.Root>
          <TryIt.ServerSelect aria-label={`${operationId} server`} />
          <TryIt.ServerVariable name="region" aria-label={`${operationId} region`} />
          <TryIt.ServerVariable name="version" aria-label={`${operationId} version`} />
          <TryIt.Server aria-label={`${operationId} URL`} />
        </TryIt.Root>
      </Operation.Root>
    )
    render(
      <SpectileProvider model={serversModel}>
        <ServerFields operationId="listPets" />
        <ServerFields operationId="upload" />
      </SpectileProvider>,
    )
    const select = screen.getByLabelText("listPets server")
    expect([...select.querySelectorAll("option")].map((option) => option.textContent)).toEqual([
      "https://api.example.com",
      "Regional",
    ])
    expect(screen.queryByLabelText("listPets region")).toBeNull()
    expect(screen.queryByLabelText("upload server")).toBeNull()

    fireEvent.change(select, { target: { value: "1" } })
    const region = screen.getByLabelText("listPets region")
    expect(region.tagName).toBe("SELECT")
    expect(screen.getByLabelText("listPets version").tagName).toBe("INPUT")
    fireEvent.change(region, { target: { value: "us" } })
    expect(screen.getByLabelText("listPets URL")).toHaveProperty(
      "value",
      "https://us.example.com/v1",
    )
    expect(screen.getByLabelText("upload URL")).toHaveProperty("value", "/uploads")
  })

  it("edits the request body", () => {
    renderTryIt("createUser")
    const body = screen.getByLabelText("Body")
    expect(JSON.parse((body as HTMLTextAreaElement).value)).toMatchObject({ name: "Ada Lovelace" })
    fireEvent.change(body, { target: { value: '{"name":"Ada"}' } })
    expect(screen.getByTestId("curl").textContent).toContain(`--data-raw '{"name":"Ada"}'`)
  })

  it("fills in a multipart body field by field", () => {
    const Fields = () => {
      const tryIt = useTryItContext()
      return (
        <>
          {tryIt.bodyFields.map((field) => (
            <TryIt.Field key={field.name} field={field} aria-label={field.name} />
          ))}
          <button type="button" onClick={tryIt.reset}>
            Reset
          </button>
        </>
      )
    }
    render(
      <SpectileProvider model={formModel}>
        <Operation.Root operation={formModel.operations[0]!}>
          <TryIt.Root>
            <Fields />
            <TryIt.Body aria-label="Body" />
            <TryIt.Curl data-testid="curl" />
          </TryIt.Root>
        </Operation.Root>
      </SpectileProvider>,
    )
    expect(screen.queryByLabelText("Body")).toBeNull()
    const photo = screen.getByLabelText("photo")
    expect(photo).toMatchObject({ type: "file", accept: "image/png", required: true })
    expect(screen.getByLabelText("extras")).toHaveProperty("multiple", true)

    fireEvent.change(screen.getByLabelText("caption"), { target: { value: "Hi" } })
    fireEvent.change(photo, {
      target: { files: [new File(["PNG"], "me.png", { type: "image/png" })] },
    })
    const curl = screen.getByTestId("curl").textContent
    expect(curl).toContain(`-F 'photo=@"me.png";type=image/png'`)
    expect(curl).toContain(`--form-string 'caption=Hi'`)

    const setValue = vi.fn()
    Object.defineProperty(photo, "value", { get: () => "", set: setValue, configurable: true })
    fireEvent.click(screen.getByRole("button", { name: "Reset" }))
    expect(setValue).toHaveBeenCalledWith("")
  })
})
