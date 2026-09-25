export function containsPattern(value: string): string {
  // PostgreSQL treats %, _, and backslash as pattern syntax in ILIKE.
  return `%${value.replace(/[\\%_]/g, '\\$&')}%`
}
