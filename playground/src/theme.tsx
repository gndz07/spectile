import { type OpenAPIDocument, normalize } from "@spectile/core"
import { ApiReference, type Layout, type TryItPreference } from "@spectile/theme"
import "@spectile/theme/styles.css"
import "@spectile/theme/fonts.css"
import { type CSSProperties, useState } from "react"
import example from "./example.json"
import { mount } from "./mount"

const model = normalize(example as OpenAPIDocument)

const TRY_IT: Record<string, TryItPreference> = {
  panel: "panel",
  drawer: "drawer",
  inline: "inline",
  off: false,
}

const bar = {
  display: "flex",
  gap: 16,
  padding: "8px 16px",
  borderBottom: "1px dashed #999",
  font: "13px system-ui",
}

/** Undoes fonts.css on this instance, back to the system stacks. */
const SYSTEM_FONTS = {
  "--spectile-font-sans": "var(--spectile-font-system-sans)",
  "--spectile-font-mono": "var(--spectile-font-system-mono)",
} as CSSProperties

const ThemePage = () => {
  const [layout, setLayout] = useState<Layout>("sidebar")
  const [tryIt, setTryIt] = useState("panel")
  const [theme, setTheme] = useState("system")
  const [fonts, setFonts] = useState("plex")
  return (
    <>
      <div style={bar}>
        <label>
          layout{" "}
          <select
            value={layout}
            onChange={(event) => setLayout(event.currentTarget.value as Layout)}
          >
            <option>sidebar</option>
            <option>stacked</option>
          </select>
        </label>
        <label>
          tryIt{" "}
          <select value={tryIt} onChange={(event) => setTryIt(event.currentTarget.value)}>
            {Object.keys(TRY_IT).map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          theme{" "}
          <select value={theme} onChange={(event) => setTheme(event.currentTarget.value)}>
            <option>system</option>
            <option>light</option>
            <option>dark</option>
          </select>
        </label>
        <label>
          fonts{" "}
          <select value={fonts} onChange={(event) => setFonts(event.currentTarget.value)}>
            <option>plex</option>
            <option>system</option>
          </select>
        </label>
      </div>
      <ApiReference
        model={model}
        layout={layout}
        tryIt={TRY_IT[tryIt]}
        tryItOptions={{ storage: sessionStorage }}
        data-theme={theme === "system" ? undefined : theme}
        style={fonts === "system" ? SYSTEM_FONTS : undefined}
      />
    </>
  )
}

mount(<ThemePage />)
