const BD_MOBILE = /^01[3-9]\d{8}$/

/** Return the local 11-digit form (01XXXXXXXXX), or null if not a valid BD mobile. */
function toLocal(value: string): string | null {
  let digits = value.replace(/[\s\-()]/g, '')
  if (digits.startsWith('+')) digits = digits.slice(1)
  if (digits.startsWith('880')) digits = '0' + digits.slice(3)
  return BD_MOBILE.test(digits) ? digits : null
}

export function isValidBDPhone(value: string): boolean {
  return toLocal(value) !== null
}

/** Normalize to +8801XXXXXXXXX (matches the backend). */
export function normalizeBDPhone(value: string): string | null {
  const local = toLocal(value)
  return local ? `+88${local}` : null
}

/** "+8801712345678" → "01712-345678" for display. */
export function formatBDPhone(value: string): string {
  const local = toLocal(value)
  return local ? `${local.slice(0, 5)}-${local.slice(5)}` : value
}
