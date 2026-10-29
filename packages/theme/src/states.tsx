import type { Issue } from "@spectile/core"

const SKELETON_ROWS = 6

export const Loading = () => (
  <div className="spectile-state" role="status" aria-busy="true" aria-label="Loading API reference">
    {Array.from({ length: SKELETON_ROWS }, (_, index) => (
      <div key={index} className="spectile-skeleton" aria-hidden />
    ))}
  </div>
)

export const LoadFailed = ({ error, retry }: { error: string; retry: () => void }) => (
  <div className="spectile-state" role="alert">
    <p className="spectile-state-title">Couldn't load the API description</p>
    <p className="spectile-state-detail">{error}</p>
    <button type="button" className="spectile-button" onClick={retry}>
      Try again
    </button>
  </div>
)

export const NoOperations = () => (
  <div className="spectile-state">
    <p className="spectile-state-title">This API has no operations</p>
  </div>
)

export const Warnings = ({ warnings }: { warnings: Issue[] }) => (
  <details className="spectile-notice" data-tone="warning">
    <summary>
      {warnings.length === 1 ? "1 problem" : `${warnings.length} problems`} found in this spec
    </summary>
    <ul>
      {warnings.map(({ message, pointer }, index) => (
        <li key={index}>
          {message} <code>{pointer}</code>
        </li>
      ))}
    </ul>
  </details>
)
