export type OpenAPIDocument = { openapi: string; [key: string]: unknown }

export type IssueCode =
  | "invalid-document"
  | "unresolved-ref"
  | "external-ref"
  | "ref-cycle"
  | "duplicate-operation-id"
  | "invalid-parameter"
  | "invalid-security-scheme"

export type Issue = { code: IssueCode; message: string; pointer: string }

export type HttpMethod = "get" | "put" | "post" | "delete" | "options" | "head" | "patch" | "trace"

export type SchemaType = "string" | "number" | "integer" | "boolean" | "object" | "array" | "null"

export type ExternalDocs = { url: string; description?: string }

export type SchemaAnnotations = {
  title?: string
  description?: string
  externalDocs?: ExternalDocs
  deprecated?: boolean
  readOnly?: boolean
  writeOnly?: boolean
  default?: unknown
  examples?: unknown[]
}

export type SchemaRef = {
  pointer: string
  refName?: string
  circular: boolean
  /** Written next to the `$ref` and winning over the target's own, e.g. a property's description. */
  annotations?: SchemaAnnotations
}

export type SchemaProperty = { name: string; required: boolean; schema: SchemaRef }

export type NumericConstraint =
  | "minimum"
  | "maximum"
  | "exclusiveMinimum"
  | "exclusiveMaximum"
  | "multipleOf"
  | "minLength"
  | "maxLength"
  | "minItems"
  | "maxItems"
  | "minProperties"
  | "maxProperties"

export type Constraints = { [K in NumericConstraint]?: number } & {
  pattern?: string
  uniqueItems?: boolean
}

export type Discriminator = { propertyName: string; mapping: Record<string, SchemaRef> }

export type SchemaNode = SchemaRef & {
  types: SchemaType[]
  /** OpenAPI 3.0's `nullable: true`. Wherever the schema has types, they include `null` too. */
  nullable?: true
  title?: string
  description?: string
  externalDocs?: ExternalDocs
  format?: string
  contentMediaType?: string
  contentEncoding?: string
  deprecated: boolean
  readOnly: boolean
  writeOnly: boolean
  enum?: unknown[]
  const?: unknown
  default?: unknown
  examples: unknown[]
  constraints: Constraints
  /** Names from `required`, including ones whose property comes from another `allOf` part. */
  required: string[]
  properties: SchemaProperty[]
  additionalProperties?: SchemaRef | boolean
  items?: SchemaRef
  allOf: SchemaRef[]
  oneOf: SchemaRef[]
  anyOf: SchemaRef[]
  not?: SchemaRef
  discriminator?: Discriminator
  issue?: Issue
}

export type Example = {
  name: string
  summary?: string
  description?: string
  value?: unknown
  externalValue?: string
}

/** How one property of a form or multipart body is sent. */
export type Encoding = {
  contentType?: string
  headers: Header[]
  style?: string
  explode?: boolean
  allowReserved?: boolean
}

export type MediaType = {
  mediaType: string
  schema?: SchemaRef
  examples: Example[]
  /** By property name; only form and multipart bodies have one. */
  encoding?: Record<string, Encoding>
}

export type ParameterLocation = "query" | "header" | "path" | "cookie"

export type ParameterFields = {
  description?: string
  required: boolean
  deprecated: boolean
  schema?: SchemaRef
  content: MediaType[]
  style?: string
  explode?: boolean
  allowReserved?: boolean
  examples: Example[]
}

export type Parameter = ParameterFields & { name: string; in: ParameterLocation }

export type Header = ParameterFields & { name: string }

export type RequestBody = {
  pointer: string
  description?: string
  required: boolean
  content: MediaType[]
}

export type Response = {
  status: string
  pointer: string
  description: string
  content: MediaType[]
  headers: Header[]
}

export type SecurityRequirement = { schemes: { name: string; scopes: string[] }[] }

export type ServerVariable = { default: string; enum?: string[]; description?: string }

export type Server = {
  url: string
  description?: string
  variables: Record<string, ServerVariable>
}

/** A webhook is a request the API sends to you, not one you send to it. */
export type OperationKind = "operation" | "webhook"

export type NormalizedOperation = {
  id: string
  kind: OperationKind
  operationId?: string
  method: HttpMethod
  /** For a webhook, its name. */
  path: string
  pointer: string
  summary?: string
  description?: string
  externalDocs?: ExternalDocs
  tags: string[]
  deprecated: boolean
  parameters: Parameter[]
  requestBody?: RequestBody
  responses: Response[]
  security: SecurityRequirement[]
  servers: Server[]
}

export type Tag = { name: string; description?: string; externalDocs?: ExternalDocs }

export type ApiKeyLocation = "query" | "header" | "cookie"

export type OAuthFlowType = "implicit" | "password" | "clientCredentials" | "authorizationCode"

export type OAuthFlow = {
  type: OAuthFlowType
  authorizationUrl?: string
  tokenUrl?: string
  refreshUrl?: string
  scopes: Record<string, string>
}

export type SecurityScheme = { name: string; description?: string } & (
  | { type: "apiKey"; in: ApiKeyLocation; paramName: string }
  | { type: "http"; scheme: string; bearerFormat?: string }
  | { type: "oauth2"; flows: OAuthFlow[] }
  | { type: "openIdConnect"; openIdConnectUrl: string }
  | { type: "mutualTLS" }
)

export type Info = { title: string; version: string; summary?: string; description?: string }

export type SpecModel = {
  document: OpenAPIDocument
  info: Info
  externalDocs?: ExternalDocs
  operations: NormalizedOperation[]
  webhooks: NormalizedOperation[]
  tags: Tag[]
  securitySchemes: SecurityScheme[]
  servers: Server[]
  warnings: Issue[]
}
