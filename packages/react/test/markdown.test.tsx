import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { model, schemaRef } from "../../headless/test/fixture";
import { Markdown, Operation, type RenderMarkdown, Schema, SpectileProvider } from "../src";

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
  });
});
