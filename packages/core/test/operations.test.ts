import { describe, expect, it } from "vitest";
import { normalize } from "../src";
import { loadFixture } from "./load-fixture";

const petstore = normalize(loadFixture("petstore-3.1.json"));

const operation = (id: string) => {
  const found = petstore.operations.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No operation ${id}`);
  return found;
};

describe("operations", () => {
  it("lists every operation in document order", () => {
    expect(petstore.operations.map(({ method, path }) => `${method} ${path}`)).toEqual([
      "get /pets",
      "post /pets",
      "get /pets/{petId}",
      "get /health",
    ]);
  });

  it("lets operation parameters override path parameters with the same name and location", () => {
    const { parameters } = operation("showPetById");
    expect(parameters.map((parameter) => `${parameter.in}:${parameter.name}`)).toEqual([
      "header:X-Trace",
      "path:petId",
    ]);
    expect(parameters[1]).toMatchObject({ description: "Operation-level id", required: true });
  });

  it("resolves referenced parameters", () => {
    expect(operation("listPets").parameters).toMatchObject([
      {
        name: "limit",
        in: "query",
        required: false,
        schema: { pointer: "#/components/parameters/Limit/schema" },
      },
    ]);
  });

  it("inherits document security unless the operation sets its own, even an empty one", () => {
    expect(operation("listPets").security).toEqual([{ schemes: [{ name: "apiKey", scopes: [] }] }]);
    expect(operation("health").security).toEqual([]);
  });

  it("resolves referenced responses and names their schemas", () => {
    const fallback = operation("listPets").responses.find(({ status }) => status === "default");
    expect(fallback).toMatchObject({
      description: "Unexpected error",
      content: [{ mediaType: "application/json", schema: { refName: "Error", circular: false } }],
    });
  });

  it("normalizes request bodies", () => {
    expect(operation("post-pets").requestBody).toMatchObject({
      required: true,
      content: [{ mediaType: "application/json", schema: { refName: "Pet" } }],
    });
  });

  it("collects declared tags first, then tags used without a declaration", () => {
    expect(petstore.tags).toEqual([
      { name: "pets", description: "Everything about pets" },
      { name: "store" },
    ]);
  });

  it("normalizes security schemes", () => {
    expect(petstore.securitySchemes).toEqual([
      { type: "apiKey", name: "apiKey", in: "header", paramName: "X-API-Key" },
    ]);
  });
});

describe("servers", () => {
  const model = normalize(loadFixture("servers.json"));
  const serversOf = (id: string) => model.operations.find((operation) => operation.id === id)?.servers;

  it("prefers operation servers, then path item servers, then document servers", () => {
    expect(serversOf("operationLevel")).toEqual([
      {
        url: "https://{region}.example.com",
        variables: { region: { default: "eu", enum: ["eu", "us"] } },
      },
    ]);
    expect(serversOf("pathLevel")).toEqual([{ url: "https://a.example.com", variables: {} }]);
    expect(serversOf("documentLevel")).toEqual([{ url: "https://api.example.com", variables: {} }]);
  });

  it("falls back to / when no servers are declared", () => {
    expect(normalize(loadFixture("operation-ids.json")).servers).toEqual([{ url: "/", variables: {} }]);
  });
});

describe("operation ids", () => {
  const model = normalize(loadFixture("operation-ids.json"));

  it("uses operationId, generates missing ids and keeps every id unique", () => {
    expect(model.operations.map(({ id }) => id)).toEqual(["fetch", "fetch-2", "delete-c-id"]);
  });

  it("warns about duplicate operationIds", () => {
    expect(model.warnings).toMatchObject([
      { code: "duplicate-operation-id", pointer: "#/paths/~1b/get" },
    ]);
  });
});
