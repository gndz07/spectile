import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const UI_FRAMEWORKS = ["react", "react-dom", "vue", "svelte", "solid-js", "preact"];

it("does not depend on a UI framework", () => {
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const dependencies = Object.keys({
    ...manifest.dependencies,
    ...manifest.peerDependencies,
    ...manifest.devDependencies,
  });
  expect(dependencies.filter((name) => UI_FRAMEWORKS.includes(name))).toEqual([]);
});
