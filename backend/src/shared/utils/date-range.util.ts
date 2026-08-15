export function inclusiveEndOfDay(dateOnly: string): Date {
  return new Date(`${dateOnly}T23:59:59.999Z`);
}
