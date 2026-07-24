// Narrowing helpers for `unknown` catch variables (strict useUnknownInCatchVariables).

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Read a property off a thrown value for logging without asserting its shape.
// Any non-null object can be read as Record<string, unknown>; the value stays unknown.
export function errorField(error: unknown, key: string): unknown {
  return typeof error === 'object' && error !== null
    ? (error as Record<string, unknown>)[key]
    : undefined;
}
