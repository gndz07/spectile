const UNITS = ["B", "KB", "MB", "GB"]

const oneDecimal = (value: number) => String(Math.round(value * 10) / 10)

/** `512 B`, `1.5 KB`, `2 MB`. */
export const formatBytes = (bytes: number) => {
  const exponent = Math.min(Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(1024)), 3)
  const value = bytes / 1024 ** exponent
  return `${exponent === 0 ? bytes : oneDecimal(value)} ${UNITS[exponent]}`
}

/** `85 ms`, `1.2 s`. */
export const formatDuration = (milliseconds: number) =>
  milliseconds < 1000 ? `${Math.round(milliseconds)} ms` : `${oneDecimal(milliseconds / 1000)} s`
