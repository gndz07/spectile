const VARIABLE = /\{([^}]+)\}/g

/** Replaces each `{name}`, leaving it as is when `valueOf` has nothing for it. */
export const fillTemplate = (template: string, valueOf: (name: string) => string | undefined) =>
  template.replace(VARIABLE, (match, name: string) => valueOf(name) ?? match)
