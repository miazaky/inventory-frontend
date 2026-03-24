/**
 * VITE_ALLOWED_EMAILS — comma-separated list of allowed emails OR domains.
 * Examples:
 *   user@wirepro.eu,admin@wirepro.eu          ← specific emails
 *   wirepro.eu                                 ← whole domain
 *   wirepro.eu,metalokaprizas.onmicrosoft.com  ← multiple domains
 */
export function getAllowed(): { emails: string[]; domains: string[] } {
  const raw = import.meta.env.VITE_ALLOWED_EMAILS ?? "";
  const entries = raw.split(",").map((e: string) => e.trim().toLowerCase()).filter(Boolean);
  const domains = entries.filter((e: string) => !e.includes("@"));
  const emails  = entries.filter((e: string) =>  e.includes("@"));
  return { emails, domains };
}

export function isEmailAllowed(email: string): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  const { emails, domains } = getAllowed();
  if (emails.includes(lower)) return true;
  const domain = lower.split("@")[1] ?? "";
  return domains.includes(domain);
}
export const getAllowedEmails = () => getAllowed().emails;
