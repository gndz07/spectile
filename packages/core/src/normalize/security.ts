import type {
  ApiKeyLocation,
  OAuthFlow,
  OAuthFlowType,
  SecurityRequirement,
  SecurityScheme,
} from "../model";
import { type Context, type Located, resolveObject } from "./context";
import { appendPointer } from "./pointer";
import { asArray, asString, asStrings, entries, isObject, isOneOf } from "./read";
import { issue } from "./refs";

const isApiKeyLocation = isOneOf<ApiKeyLocation>(["query", "header", "cookie"]);

const isOAuthFlowType = isOneOf<OAuthFlowType>([
  "implicit",
  "password",
  "clientCredentials",
  "authorizationCode",
]);

export const securityRequirements = (value: unknown): SecurityRequirement[] =>
  asArray(value)
    .filter(isObject)
    .map((requirement) => ({
      schemes: Object.entries(requirement).map(([name, scopes]) => ({
        name,
        scopes: asStrings(scopes),
      })),
    }));

const oauthFlows = (value: unknown): OAuthFlow[] =>
  entries(value).flatMap(([type, flow]) => {
    if (!isOAuthFlowType(type) || !isObject(flow)) return [];
    return [
      {
        type,
        authorizationUrl: asString(flow.authorizationUrl),
        tokenUrl: asString(flow.tokenUrl),
        refreshUrl: asString(flow.refreshUrl),
        scopes: Object.fromEntries(
          entries(flow.scopes).map(([scope, description]) => [scope, asString(description) ?? ""]),
        ),
      },
    ];
  });

const securityScheme = (name: string, { value }: Located): SecurityScheme | undefined => {
  const description = asString(value.description);
  switch (value.type) {
    case "apiKey": {
      const paramName = asString(value.name);
      if (!isApiKeyLocation(value.in) || paramName === undefined) return undefined;
      return { type: "apiKey", name, description, in: value.in, paramName };
    }
    case "http": {
      const scheme = asString(value.scheme);
      if (scheme === undefined) return undefined;
      const bearerFormat = asString(value.bearerFormat);
      return { type: "http", name, description, scheme: scheme.toLowerCase(), bearerFormat };
    }
    case "oauth2":
      return { type: "oauth2", name, description, flows: oauthFlows(value.flows) };
    case "openIdConnect": {
      const openIdConnectUrl = asString(value.openIdConnectUrl);
      if (openIdConnectUrl === undefined) return undefined;
      return { type: "openIdConnect", name, description, openIdConnectUrl };
    }
    case "mutualTLS":
      return { type: "mutualTLS", name, description };
    default:
      return undefined;
  }
};

export const securitySchemes = (context: Context): SecurityScheme[] => {
  const components = context.document.components;
  const schemes = isObject(components) ? components.securitySchemes : undefined;
  return entries(schemes).flatMap(([name]) => {
    const pointer = appendPointer("#", "components", "securitySchemes", name);
    const located = resolveObject(context, pointer);
    if (!located) return [];
    const scheme = securityScheme(name, located);
    if (scheme) return [scheme];
    context.issues.push(
      issue("invalid-security-scheme", `Security scheme ${name} is missing required fields`, pointer),
    );
    return [];
  });
};
