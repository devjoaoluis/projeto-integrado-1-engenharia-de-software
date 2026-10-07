export function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required`);
  return value.trim();
}

export function contactDocument(value: unknown): string {
  const document = requiredText(value, "CPF/CNPJ");
  if (!/^[\d./\- ]+$/.test(document) || ![11, 14].includes(document.replace(/\D/g, "").length)) {
    throw new Error("CPF/CNPJ must contain 11 or 14 digits");
  }
  return document.replace(/\D/g, "");
}

export function optionalEmail(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("Email must be text");
  return value.trim() || null;
}
