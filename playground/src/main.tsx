import { type OpenAPIDocument, normalize } from "@spectile/core"
import { ApiReference, type TryItPreference } from "@spectile/theme"
import "@spectile/theme/styles.css"
import "@spectile/theme/fonts.css"
import { type SubmitEvent, useEffect, useState } from "react"
import example from "./example.json"
import { mount } from "./mount"
import "./styles.css"

const model = normalize(example as OpenAPIDocument)

const OPTIONS = {
  layout: ["sidebar", "stacked"],
  tryIt: ["panel", "drawer", "inline", "off"],
  theme: ["system", "light", "dark"],
  fonts: ["plex", "system"],
  brand: ["default", "rebrand"],
  width: ["full", "1280", "1000", "800", "375"],
} as const

type Settings = { [K in keyof typeof OPTIONS]: (typeof OPTIONS)[K][number] }

const DEFAULTS: Settings = {
  layout: "sidebar",
  tryIt: "panel",
  theme: "system",
  fonts: "plex",
  brand: "default",
  width: "full",
}

const tryItPreference = (value: Settings["tryIt"]): TryItPreference =>
  value === "off" ? false : value

const frameClass = ({ fonts, brand }: Settings) =>
  [fonts === "system" && "system-fonts", brand === "rebrand" && "rebrand"]
    .filter(Boolean)
    .join(" ")

const frameWidth = ({ width }: Settings) => (width === "full" ? undefined : `${width}px`)

const SettingSelect = <K extends keyof Settings>({
  name,
  value,
  onChange,
}: {
  name: K
  value: Settings[K]
  onChange: (value: Settings[K]) => void
}) => (
  <label>
    {name}
    <select
      className="spectile-select"
      data-size="small"
      value={value}
      onChange={(event) => onChange(event.currentTarget.value as Settings[K])}
    >
      {OPTIONS[name].map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  </label>
)

const SpecForm = ({ onLoad }: { onLoad: (url?: string) => void }) => {
  const [url, setUrl] = useState("")
  const submit = (event: SubmitEvent) => {
    event.preventDefault()
    onLoad(url || undefined)
  }
  return (
    <form className="spec-form" onSubmit={submit}>
      <input
        className="spectile-input"
        type="url"
        placeholder="OpenAPI URL (empty for the example)"
        aria-label="OpenAPI URL"
        value={url}
        onChange={(event) => setUrl(event.currentTarget.value)}
      />
      <button className="spectile-button" data-size="small" type="submit">
        Load
      </button>
    </form>
  )
}

const Playground = () => {
  const [settings, setSettings] = useState(DEFAULTS)
  const [specUrl, setSpecUrl] = useState<string>()
  const set = <K extends keyof Settings>(name: K) => (value: Settings[K]) =>
    setSettings((current) => ({ ...current, [name]: value }))

  useEffect(() => {
    const root = document.documentElement
    if (settings.theme === "system") delete root.dataset.theme
    else root.dataset.theme = settings.theme
  }, [settings.theme])

  const tryItOptions = { baseUrl: specUrl, storage: sessionStorage }
  const source = specUrl ? { spec: specUrl } : { model }

  return (
    <>
      <header className="toolbar">
        <span className="toolbar-title">Spectile playground</span>
        <SpecForm onLoad={setSpecUrl} />
        <div className="toolbar-settings">
          {(Object.keys(OPTIONS) as (keyof Settings)[]).map((name) => (
            <SettingSelect key={name} name={name} value={settings[name]} onChange={set(name)} />
          ))}
        </div>
        <a className="toolbar-link" href="unstyled.html">
          Unstyled primitives
        </a>
      </header>
      <div className="frame" style={{ maxWidth: frameWidth(settings) }}>
        <ApiReference
          {...source}
          key={specUrl ?? "example"}
          className={frameClass(settings)}
          layout={settings.layout}
          tryIt={tryItPreference(settings.tryIt)}
          tryItOptions={tryItOptions}
        />
      </div>
    </>
  )
}

mount(<Playground />)
