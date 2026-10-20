import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { model } from "../../headless/test/fixture"
import { Operation, SpectileProvider, useNavigation } from "../src"

const ActiveOperation = () => (
  <Operation.Root data-testid="operation">
    <Operation.Method /> <Operation.Path /> <Operation.Summary />
  </Operation.Root>
)

const Sidebar = () => {
  const { groups, getItemProps, getSearchProps } = useNavigation()
  return (
    <nav>
      <input aria-label="Search" {...getSearchProps()} />
      {groups.map(({ kind, tag, operations }) => (
        <ul key={tag?.name ?? kind} aria-label={tag?.name ?? kind}>
          {operations.map((operation) => (
            <li key={operation.id}>
              <button type="button" {...getItemProps(operation)}>
                {operation.id}
              </button>
            </li>
          ))}
        </ul>
      ))}
    </nav>
  )
}

describe("Operation primitives", () => {
  it("renders the active operation", () => {
    render(
      <SpectileProvider model={model} defaultActiveId="createUser">
        <ActiveOperation />
      </SpectileProvider>,
    )
    const operation = screen.getByTestId("operation")
    expect(operation.tagName).toBe("SECTION")
    expect(operation.textContent).toBe("POST /users Create a user")
    expect(operation.dataset).toMatchObject({ method: "post", deprecated: "" })
  })

  it("renders nothing without an active operation", () => {
    render(
      <SpectileProvider model={model}>
        <ActiveOperation />
      </SpectileProvider>,
    )
    expect(screen.queryByTestId("operation")).toBeNull()
  })

  it("renders a given operation", () => {
    const [operation] = model.operations
    render(
      <SpectileProvider model={model}>
        <Operation.Root operation={operation}>
          <Operation.Path />
        </Operation.Root>
      </SpectileProvider>,
    )
    expect(screen.getByText("/users")).toBeDefined()
  })

  it("keeps the default text when a text part renders its child", () => {
    const [operation] = model.operations
    render(
      <SpectileProvider model={model}>
        <Operation.Root operation={operation}>
          <Operation.Path asChild>
            <a href="#users" />
          </Operation.Path>
          <Operation.Summary asChild>
            <h1>Custom</h1>
          </Operation.Summary>
        </Operation.Root>
      </SpectileProvider>,
    )
    expect(screen.getByRole("link").textContent).toBe("/users")
    expect(screen.getByRole("heading").textContent).toBe("Custom")
  })
})

describe("useNavigation", () => {
  it("drives search and the active operation", () => {
    render(
      <SpectileProvider model={model}>
        <Sidebar />
        <ActiveOperation />
      </SpectileProvider>,
    )
    fireEvent.change(screen.getByRole("searchbox", { name: "Search" }), {
      target: { value: "pet" },
    })
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["getPet"])
    fireEvent.click(screen.getByRole("button", { name: "getPet" }))
    expect(screen.getByRole("button", { name: "getPet" }).getAttribute("aria-current")).toBe("page")
    expect(screen.getByTestId("operation").textContent).toBe("GET /pets/{id} Fetch a pet")
  })
})
