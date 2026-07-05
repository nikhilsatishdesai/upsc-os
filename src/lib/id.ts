/** Collision-safe id for locally created entities. */
export function makeId(prefix = "k"): string {
  return typeof globalThis.crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
