import { type SchemaRef, normalize } from "@spectile/core";

const json = { "application/json": { schema: { $ref: "#/components/schemas/User" } } };

export const model = normalize({
  openapi: "3.1.0",
  info: { title: "Fixture", version: "1.0.0" },
  tags: [{ name: "users" }, { name: "pets" }, { name: "admin" }],
  paths: {
    "/users": {
      get: {
        operationId: "listUsers",
        summary: "List users",
        tags: ["users"],
        responses: { "200": { description: "Users", content: json } },
      },
      post: {
        operationId: "createUser",
        summary: "Create a user",
        tags: ["users", "admin"],
        deprecated: true,
        responses: { "201": { description: "Created" } },
      },
    },
    "/pets/{id}": {
      get: {
        operationId: "getPet",
        summary: "Fetch a pet",
        tags: ["pets"],
        responses: { "200": { description: "A pet" } },
      },
    },
    "/health": {
      get: { operationId: "health", responses: { "204": { description: "Healthy" } } },
    },
  },
  components: {
    schemas: {
      User: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
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

export const schemaRef = (name: string): SchemaRef => ({
  pointer: `#/components/schemas/${name}`,
  circular: false,
});
