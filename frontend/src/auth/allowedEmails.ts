export function getAllowedEmails(): string[] {
  const raw = import.meta.env.VITE_ALLOWED_EMAILS ?? "";
  return raw
    .split(",")
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email: string): boolean {
  return getAllowedEmails().includes(email.toLowerCase());
}
