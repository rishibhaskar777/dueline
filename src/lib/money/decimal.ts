const AMOUNT_PATTERN = /^-?\d+(\.\d{1,2})?$/;

export function toMinorUnits(value: string): number {
  if (!AMOUNT_PATTERN.test(value)) throw new RangeError(`Not a decimal amount: ${value}`);
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = value.replace("-", "").split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return negative ? -minor : minor;
}

export function fromMinorUnits(minor: number): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
