const NON_DIGITS_PATTERN = /\D+/g;
const VIETNAMESE_PHONE_PATTERN = /^0\d{9}$/;

export function normalizePhone(value: string): string {
  let digits = value.replace(NON_DIGITS_PATTERN, "");

  if (digits.startsWith("84")) {
    digits = `0${digits.slice(2)}`;
  }

  if (!digits.startsWith("0") && digits.length > 0) {
    digits = `0${digits}`;
  }

  return digits;
}

export function isVietnamPhone(value: string): boolean {
  const normalized = normalizePhone(value);
  return VIETNAMESE_PHONE_PATTERN.test(normalized);
}

export function maskPhone(value: string): string {
  const normalized = normalizePhone(value);

  if (normalized.length < 7) {
    return normalized;
  }

  return `${normalized.slice(0, 3)}****${normalized.slice(-3)}`;
}
