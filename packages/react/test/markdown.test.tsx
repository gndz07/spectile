import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { model, operation, schemaRef } from "../../headless/test/fixture";
import {
  Info,
  Markdown,
  Navigation,
  Operation,
  Parameter,
  type RenderMarkdown,
  RequestBody,
  Response,
  Schema,
  SpectileProvider,
} from "../src";

const users = operation("listUsers").responses[0]!;

const Descriptions = ({ renderMarkdown }: { renderMarkdown?: RenderMarkdown }) => (
  <SpectileProvider model={model} defaultActiveId="getPet" renderMarkdown={renderMarkdown}>
    <Operation.Root>
      <Operation.Description data-testid="operation" />
    </Operation.Root>
    <Schema.Root schema={schemaRef("User")}>
      <Schema.Rows>
        {(row) => (
          <Schema.Row row={row}>
            <Schema.Description data-testid={`row-${row.name}`} />
          </Schema.Row>
        )}
      </Schema.Rows>
    </Schema.Root>
    <Markdown source="A `string`" data-testid="custom" />
    <Markdown source={undefined} data-testid="empty" />
    <Info.Description data-testid="info" />
    <Operation.Root operation={operation("createUser")}>
      <RequestBody.Root>
        <RequestBody.Description data-testid="body" />
      </RequestBody.Root>
    </Operation.Root>
    <Parameter.Root parameter={operation("getPet").parameters[0]!}>
      <Parameter.Description data-testid="parameter" />
    </Parameter.Root>
    <Response.Root response={users}>
      <Response.Description data-testid="response" />
    </Response.Root>
    <Parameter.Root parameter={users.headers[0]!}>
      <Parameter.Description data-testid="header" />
    </Parameter.Root>
    <Navigation.Groups>
      {(group) => (
        <Navigation.Group group={group}>
          <Navigation.GroupDescription data-testid={`tag-${group.tag?.name}`} />
        </Navigation.Group>
      )}
    </Navigation.Groups>
  </SpectileProvider>
);

describe("Markdown", () => {
  it("renders plain text without a renderer", () => {
    render(<Descriptions />);
    const operation = screen.getByTestId("operation");
    expect(operation.tagName).toBe("DIV");
    expect(operation.innerHTML).toBe("Returns **one** pet.");
    expect(screen.getByTestId("row-name").textContent).toBe("Display _name_");
    expect(screen.queryByTestId("row-friends")).toBeNull();
    expect(screen.queryByTestId("empty")).toBeNull();
  });

  it("renders every description with the provider's renderer", () => {
    render(<Descriptions renderMarkdown={(markdown) => <em>{markdown.toUpperCase()}</em>} />);
    expect(screen.getByTestId("operation").innerHTML).toBe("<em>RETURNS **ONE** PET.</em>");
    expect(screen.getByTestId("row-name").innerHTML).toBe("<em>DISPLAY _NAME_</em>");
    expect(screen.getByTestId("custom").innerHTML).toBe("<em>A `STRING`</em>");
    expect(screen.getByTestId("info").innerHTML).toBe("<em>THE _FIXTURE_ API</em>");
    expect(screen.getByTestId("body").innerHTML).toBe("<em>THE _NEW_ USER</em>");
    expect(screen.getByTestId("parameter").innerHTML).toBe("<em>THE PET'S `ID`</em>");
    expect(screen.getByTestId("response").innerHTML).toBe("<em>USERS</em>");
    expect(screen.getByTestId("header").innerHTML).toBe("<em>HOW _MANY_</em>");
    expect(screen.getByTestId("tag-users").innerHTML).toBe("<em>ALL **USERS**</em>");
    expect(screen.queryByTestId("tag-pets")).toBeNull();
  });
});
