import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { model, operation } from "../../headless/test/fixture"
import {
  Info,
  Navigation,
  Operation,
  Parameter,
  RequestBody,
  Response,
  SpectileProvider,
} from "../src"

const Parameters = ({ id }: { id: string }) =>
  operation(id).parameters.map((parameter) => (
    <Parameter.Root key={parameter.name} parameter={parameter} data-testid={parameter.name}>
      <Parameter.Name /> <Parameter.Location /> <Parameter.Type /> <Parameter.Required />
    </Parameter.Root>
  ))

describe("Info", () => {
  it("renders the API info", () => {
    render(
      <SpectileProvider model={model}>
        <h1 data-testid="title">
          <Info.Title /> <Info.Version />
          <Info.Summary />
        </h1>
        <Info.Description data-testid="description" />
      </SpectileProvider>,
    )
    expect(screen.getByTestId("title").textContent).toBe("Fixture 1.0.0")
    expect(screen.getByTestId("description").textContent).toBe("The _fixture_ API")
  })
})

describe("Parameter", () => {
  it("renders each parameter's fields and state", () => {
    render(
      <SpectileProvider model={model}>
        <Parameters id="getPet" />
      </SpectileProvider>,
    )
    const id = screen.getByTestId("id")
    expect(id.textContent).toBe("id path string required")
    expect(id.dataset).toMatchObject({ location: "path", required: "" })
    expect(screen.getByTestId("fields").textContent).toBe("fields query string[] ")
    expect(screen.getByTestId("fields").dataset.required).toBeUndefined()
  })

  it("renders a response header", () => {
    const [header] = operation("listUsers").responses[0]!.headers
    render(
      <SpectileProvider model={model}>
        <Parameter.Root parameter={header!} data-testid="header">
          <Parameter.Name />
          <Parameter.Location />: <Parameter.Type />
        </Parameter.Root>
      </SpectileProvider>,
    )
    const element = screen.getByTestId("header")
    expect(element.textContent).toBe("X-Total: integer")
    expect(element.dataset.location).toBeUndefined()
  })
})

describe("RequestBody", () => {
  const Body = () => (
    <RequestBody.Root data-testid="body">
      <RequestBody.Required />
      <RequestBody.Description />
    </RequestBody.Root>
  )

  it("renders the operation's request body", () => {
    render(
      <SpectileProvider model={model}>
        <Operation.Root operation={operation("createUser")}>
          <Body />
        </Operation.Root>
      </SpectileProvider>,
    )
    expect(screen.getByTestId("body").textContent).toBe("The _new_ user")
  })

  it("renders nothing when the operation takes no body", () => {
    render(
      <SpectileProvider model={model}>
        <Operation.Root operation={operation("getPet")}>
          <Body />
        </Operation.Root>
      </SpectileProvider>,
    )
    expect(screen.queryByTestId("body")).toBeNull()
  })
})

describe("Response", () => {
  it("renders each response", () => {
    render(
      <SpectileProvider model={model}>
        {operation("listUsers").responses.map((response) => (
          <Response.Root key={response.status} response={response} data-testid="response">
            <Response.Status /> <Response.Description />
          </Response.Root>
        ))}
      </SpectileProvider>,
    )
    const response = screen.getByTestId("response")
    expect(response.textContent).toBe("200 Users")
    expect(response.dataset.status).toBe("200")
  })
})

describe("Navigation", () => {
  it("lists, searches and activates operations", () => {
    render(
      <SpectileProvider model={model}>
        <Navigation.Search aria-label="Search" />
        <Navigation.Groups>
          {(group) => (
            <Navigation.Group group={group} data-testid={group.tag?.name ?? "untagged"}>
              <Navigation.GroupName />
              <Navigation.GroupDescription />
              {group.operations.map((each) => (
                <Navigation.Item key={each.id} operation={each}>
                  <Operation.Method /> <Operation.Summary />
                </Navigation.Item>
              ))}
            </Navigation.Group>
          )}
        </Navigation.Groups>
        <Operation.Root data-testid="active">
          <Operation.Path />
        </Operation.Root>
      </SpectileProvider>,
    )
    expect(screen.getByTestId("users").textContent).toBe(
      "usersAll **users**GET List usersPOST Create a user",
    )
    expect(screen.getByTestId("untagged").textContent).toBe("GET ")

    fireEvent.change(screen.getByRole("searchbox", { name: "Search" }), {
      target: { value: "pet" },
    })
    const item = screen.getByRole("button", { name: "GET Fetch a pet" })
    expect(screen.getAllByRole("button")).toEqual([item])
    expect(item.getAttribute("type")).toBe("button")

    fireEvent.click(item)
    expect(item.getAttribute("aria-current")).toBe("page")
    expect(item.dataset.state).toBe("active")
    expect(screen.getByTestId("active").textContent).toBe("/pets/{id}")
  })
})
