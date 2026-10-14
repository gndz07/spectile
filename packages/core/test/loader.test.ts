import { describe, expect, it } from "vitest";
import { getSchema, normalize } from "../src";
import { loadSpec } from "../src/loader";
import { loadFixture } from "./load-fixture";

const loadModel = async (name: string) => {
  const { document, warnings } = await loadSpec(loadFixture(name));
  const model = normalize(document);
  const { document: _, ...rest } = model;
  return { ...rest, loadWarnings: warnings, pet: getSchema(model, "#/components/schemas/Pet") };
};

describe("loadSpec", () => {
  it("turns Swagger 2.0, OpenAPI 3.0 and OpenAPI 3.1 into the same model", async () => {
    const [v2, v30, v31] = await Promise.all([
      loadModel("petstore-2.0.json"),
      loadModel("petstore-3.0.json"),
      loadModel("petstore-3.1.json"),
    ]);
    expect(v31.loadWarnings).toEqual([]);
    expect(v30).toEqual(v31);
    expect(v2).toEqual(v31);
  });

  it("parses YAML and JSON text", async () => {
    const yaml = "openapi: 3.1.0\ninfo:\n  title: Yaml\n  version: 1.0.0\npaths: {}\n";
    const json = JSON.stringify({ openapi: "3.1.0", info: { title: "Json", version: "1.0.0" }, paths: {} });
    expect((await loadSpec(yaml)).document.info).toEqual({ title: "Yaml", version: "1.0.0" });
    expect((await loadSpec(json)).document.info).toEqual({ title: "Json", version: "1.0.0" });
  });

  it("does not mutate object input", async () => {
    const input = loadFixture("petstore-2.0.json");
    const before = structuredClone(input);
    await loadSpec(input);
    expect(input).toEqual(before);
  });

  it("returns validation problems as warnings and keeps the document", async () => {
    const { document, warnings } = await loadSpec({ openapi: "3.1.0", paths: {} });
    expect(document.openapi).toBe("3.1.0");
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.every(({ code }) => code === "invalid-document")).toBe(true);
  });

  it("rejects input that is not an API description", async () => {
    await expect(loadSpec({ hello: "world" })).rejects.toThrow();
  });
});
