import { type SchemaRef, normalize } from "@spectile/core";

const json = { "application/json": { schema: { $ref: "#/components/schemas/User" } } };

export const model = normalize({
  openapi: "3.1.0",
  info: { title: "Fixture", version: "1.0.0", description: "The _fixture_ API" },
  tags: [{ name: "users", description: "All **users**" }, { name: "pets" }, { name: "admin" }],
  servers: [{ url: "https://api.example.com/v1" }],
  security: [{ apiKey: [] }],
  paths: {
    "/users": {
      get: {
        operationId: "listUsers",
        summary: "List users",
        tags: ["users"],
        responses: {
          "200": {
            description: "Users",
            content: json,
            headers: { "X-Total": { description: "How _many_", schema: { type: "integer" } } },
          },
        },
      },
      post: {
        operationId: "createUser",
        summary: "Create a user",
        tags: ["users", "admin"],
        deprecated: true,
        requestBody: { description: "The _new_ user", content: json },
        responses: { "201": { description: "Created" } },
      },
    },
    "/pets/{id}": {
      get: {
        operationId: "getPet",
        summary: "Fetch a pet",
        description: "Returns **one** pet.",
        tags: ["pets"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "The pet's `id`",
            schema: { type: "string" },
          },
          {
            name: "fields",
            in: "query",
            schema: { type: "array", items: { type: "string" } },
            example: ["name", "age"],
          },
        ],
        responses: { "200": { description: "A pet" } },
      },
    },
    "/health": {
      get: {
        operationId: "health",
        security: [],
        responses: { "204": { description: "Healthy" } },
      },
    },
  },
  components: {
    securitySchemes: { apiKey: { type: "apiKey", in: "header", name: "X-API-Key" } },
    schemas: {
      User: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", description: "Display _name_" },
          friends: { type: "array", items: { $ref: "#/components/schemas/User" } },
          profile: { $ref: "#/components/schemas/Profile" },
        },
      },
      Profile: { type: "object", properties: { bio: { type: "string" } } },
      Pet: { oneOf: [{ $ref: "#/components/schemas/Cat" }, { $ref: "#/components/schemas/Dog" }] },
      Cat: { type: "object", properties: { meows: { type: "boolean" } } },
      Dog: { type: "object", properties: { barks: { type: "boolean" } } },
      Name: { type: "string" },
    },
  },
});

export const operation = (id: string) => model.operations.find((each) => each.id === id)!;

export const serversModel = normalize({
  openapi: "3.1.0",
  info: { title: "Servers", version: "1.0.0" },
  servers: [
    { url: "https://api.example.com" },
    {
      url: "https://{region}.example.com/{version}",
      description: "Regional",
      variables: { region: { default: "eu", enum: ["eu", "us"] }, version: { default: "v1" } },
    },
  ],
  paths: {
    "/pets": { get: { operationId: "listPets", responses: {} } },
    "/users": { get: { operationId: "listUsers", responses: {} } },
    "/files": {
      servers: [{ url: "/uploads" }],
      post: { operationId: "upload", responses: {} },
    },
  },
});

export const schemaRef =(name: string): SchemaRef => ({
  pointer: `#/components/schemas/${name}`,
  circular: false,
});
