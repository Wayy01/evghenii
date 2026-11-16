/**
 * Normalises what people actually type in Moldova ("069 123 456", "69123456",
 * "+373 69 123 456") to E.164. Returns null when it can't be a phone number.
 */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") || trimmed.startsWith("00")) {
    const intl = trimmed.startsWith("00") ? digits.slice(2) : digits;
    return intl.length >= 8 && intl.length <= 15 ? `+${intl}` : null;
  }
  if (digits.startsWith("373") && digits.length === 11) return `+${digits}`;
  if (digits.length === 9 && digits.startsWith("0")) return `+373${digits.slice(1)}`;
  if (digits.length === 8) return `+373${digits}`;
  return null;
}

/** +37369123456 -> +373 69 123 456 */
export function formatPhone(e164: string): string {
  const m = e164.match(/^\+373(\d{2})(\d{3})(\d{3})$/);
  return m ? `+373 ${m[1]} ${m[2]} ${m[3]}` : e164;
}
