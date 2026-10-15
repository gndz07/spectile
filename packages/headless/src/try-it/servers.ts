import { type Server, absoluteUrl, resolveServerUrl } from "@spectile/core";
import type { ServerSelection } from "./types";

export const FIRST_SERVER: ServerSelection = { index: 0, variables: {} };

/** Operations whose server lists have the same URLs share one selection. */
export const serverListKey = (servers: readonly Server[]) =>
  JSON.stringify(servers.map(({ url }) => url));

export const selectedServerUrl = (
  servers: readonly Server[],
  { index, variables, url }: ServerSelection,
  baseUrl?: string,
) => {
  if (url !== undefined) return url;
  const server = servers[index];
  return server ? absoluteUrl(resolveServerUrl(server, variables), baseUrl) : "";
};

export const chooseServer = (index: number): ServerSelection => ({ index, variables: {} });

export const withServerVariable = (
  { index, variables }: ServerSelection,
  name: string,
  value: string,
): ServerSelection => ({ index, variables: { ...variables, [name]: value } });

export const withServerUrl = (selection: ServerSelection, url: string): ServerSelection => ({
  ...selection,
  url,
});
