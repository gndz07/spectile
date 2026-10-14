import { readFileSync } from "node:fs";
import type { OpenAPIDocument } from "../src";

export const loadFixture = (name: string): OpenAPIDocument =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
