import type { MediaType } from "@spectile/core"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { formModel, model, operation, schemaRef } from "../../headless/test/fixture"
import {
  Example,
  ExternalDocs,
  Info,
  Navigation,
  Operation,
  Parameter,
  RequestBody,
  Response,
  SpectileProvider,
  useRequestBodyMedia,
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

describe("ExternalDocs", () => {
  it("links to the docs", () => {
    render(
      <ExternalDocs.Root externalDocs={model.externalDocs} data-testid="docs">
        <ExternalDocs.Link />
        <ExternalDocs.Link>Read more</ExternalDocs.Link>
        <ExternalDocs.Description />
      </ExternalDocs.Root>,
    )
    const links = screen.getAllByRole("link")
    expect(links.map((link) => [link.getAttribute("href"), link.textContent])).toEqual([
      ["https://docs.example.com", "https://docs.example.com"],
      ["https://docs.example.com", "Read more"],
    ])
    expect(screen.getByTestId("docs").textContent).toContain("More _docs_")
  })

  it("renders nothing without docs", () => {
    const { container } = render(
      <ExternalDocs.Root externalDocs={operation("getPet").externalDocs}>
        <ExternalDocs.Link />
      </ExternalDocs.Root>,
    )
    expect(container.innerHTML).toBe("")
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
            <Navigation.Group group={group} data-testid={group.tag?.name ?? group.kind}>
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
    expect(screen.getByTestId("operation").textContent).toBe("GET ")
    const webhooks = screen.getByTestId("webhook")
    expect(webhooks.textContent).toBe("POST A user signed up")
    expect(webhooks.dataset.kind).toBe("webhook")

    fireEvent.click(screen.getByRole("button", { name: "POST A user signed up" }))
    expect(screen.getByTestId("active").textContent).toBe("userCreated")
    expect(screen.getByTestId("active").dataset.kind).toBe("webhook")

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

  const TreeNavigation = () => (
    <SpectileProvider model={model} defaultActiveId="getPet">
      <Navigation.Search aria-label="Search" />
      <Navigation.ResultCount data-testid="count" />
      <Navigation.Tree aria-label="Operations">
        <Navigation.Groups>
          {(group) => (
            <Navigation.Group group={group} aria-label={group.tag?.name ?? group.kind}>
              <Navigation.GroupToggle>
                <Navigation.GroupName />
              </Navigation.GroupToggle>
              <Navigation.GroupItems>
                {group.operations.map((each) => (
                  <Navigation.Item key={each.id} operation={each}>
                    <Navigation.Highlight text={each.summary ?? each.path} />
                  </Navigation.Item>
                ))}
              </Navigation.GroupItems>
            </Navigation.Group>
          )}
        </Navigation.Groups>
      </Navigation.Tree>
    </SpectileProvider>
  )

  it("moves through groups and items with the keyboard", () => {
    render(<TreeNavigation />)
    const item = (name: string) => screen.getByRole("treeitem", { name })
    const pets = item("pets")
    const pet = item("Fetch a pet")
    expect(pet.tabIndex).toBe(0)
    act(() => pet.focus())
    fireEvent.keyDown(pet, { key: "ArrowLeft" })
    expect(document.activeElement).toBe(pets)
    fireEvent.keyDown(pets, { key: "ArrowLeft" })
    expect(pets.getAttribute("aria-expanded")).toBe("false")
    expect(screen.queryByRole("treeitem", { name: "Fetch a pet" })).toBeNull()
    fireEvent.keyDown(pets, { key: "ArrowUp" })
    expect(document.activeElement).toBe(
      screen.getAllByRole("treeitem", { name: "Create a user" })[0],
    )
    fireEvent.click(screen.getByText("pets"))
    expect(item("Fetch a pet")).toBeDefined()
  })

  it("keeps a closed group's items with forceMount, marked closed", () => {
    const OpenState = () => <span data-testid="open">{String(Navigation.useGroupOpen())}</span>
    render(
      <SpectileProvider model={model}>
        <Navigation.Tree aria-label="Operations">
          <Navigation.Groups>
            {(group) =>
              group.tag?.name === "pets" && (
                <Navigation.Group group={group}>
                  <Navigation.GroupToggle>pets</Navigation.GroupToggle>
                  <OpenState />
                  <Navigation.GroupItems forceMount data-testid="items" />
                </Navigation.Group>
              )
            }
          </Navigation.Groups>
        </Navigation.Tree>
      </SpectileProvider>,
    )
    expect(screen.getByTestId("items").dataset.state).toBe("open")
    fireEvent.click(screen.getByText("pets"))
    expect(screen.getByTestId("items").dataset.state).toBe("closed")
    expect(screen.getByTestId("open").textContent).toBe("false")
  })

  it("highlights search matches and announces the result count", () => {
    render(<TreeNavigation />)
    fireEvent.change(screen.getByRole("searchbox", { name: "Search" }), {
      target: { value: "pet" },
    })
    expect(screen.getByTestId("count").textContent).toBe("1")
    expect(screen.getByTestId("count").getAttribute("aria-live")).toBe("polite")
    const marks = [...document.querySelectorAll("mark")].map((mark) => mark.textContent)
    expect(marks).toEqual(["pet"])
    expect(screen.getByRole("treeitem", { name: "Fetch a pet" }).textContent).toBe("Fetch a pet")
  })
})

describe("Example", () => {
  const media = (examples: MediaType["examples"]): MediaType => ({
    mediaType: "application/json",
    schema: schemaRef("Profile"),
    examples,
  })

  it("shows a value built from the schema when there are no examples", () => {
    render(
      <SpectileProvider model={model}>
        <Example.Root media={media([])} data-testid="example">
          <Example.Select aria-label="Example" />
          <Example.Value />
        </Example.Root>
      </SpectileProvider>,
    )
    expect(screen.getByTestId("example").textContent).toBe('{\n  "bio": "string"\n}')
    expect(screen.queryByRole("combobox")).toBeNull()
  })

  it("picks between named examples", () => {
    render(
      <SpectileProvider model={model}>
        <Example.Root media={media([
          { name: "short", summary: "Short", value: { bio: "Hi" } },
          { name: "text", description: "Plain _text_", value: "hello" },
        ])}>
          <Example.Select aria-label="Example" />
          <Example.Summary data-testid="summary" />
          <Example.Description data-testid="description" />
          <Example.Value data-testid="value" />
        </Example.Root>
      </SpectileProvider>,
    )
    const select = screen.getByRole("combobox", { name: "Example" })
    expect([...select.querySelectorAll("option")].map((option) => option.textContent)).toEqual([
      "Short",
      "text",
    ])
    expect(screen.getByTestId("summary").textContent).toBe("Short")
    fireEvent.change(select, { target: { value: "1" } })
    expect(screen.getByTestId("value").textContent).toBe("hello")
    expect(screen.getByTestId("description").textContent).toBe("Plain _text_")
    expect(screen.queryByTestId("summary")).toBeNull()
  })
})

describe("RequestBody.MediaSelect", () => {
  it("switches the content type for the docs and the try-it form", () => {
    const Media = () => <span data-testid="media">{useRequestBodyMedia()?.mediaType}</span>
    render(
      <SpectileProvider model={formModel}>
        <Operation.Root operation={formModel.operations[0]!}>
          <RequestBody.Root>
            <RequestBody.MediaSelect aria-label="Content type" />
            <Media />
          </RequestBody.Root>
        </Operation.Root>
      </SpectileProvider>,
    )
    expect(screen.getByTestId("media").textContent).toBe("multipart/form-data")
    fireEvent.change(screen.getByRole("combobox", { name: "Content type" }), {
      target: { value: "application/x-www-form-urlencoded" },
    })
    expect(screen.getByTestId("media").textContent).toBe("application/x-www-form-urlencoded")
  })

  it("renders nothing for a single content type, and works for webhooks", () => {
    render(
      <SpectileProvider model={model}>
        <Operation.Root operation={model.webhooks[0]!}>
          <RequestBody.Root>
            <RequestBody.MediaSelect aria-label="Content type" />
          </RequestBody.Root>
        </Operation.Root>
      </SpectileProvider>,
    )
    expect(screen.queryByRole("combobox")).toBeNull()
  })
})
