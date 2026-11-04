/** Shared auth presentation tokens — match landing page azure CTA */

export const AUTH_CTA =
  "h-11 w-full rounded-lg bg-azure-600 text-[15px] font-medium text-white hover:bg-azure-700 dark:bg-azure-500 dark:hover:bg-azure-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure-500/40";

export const AUTH_INPUT =
  "h-11 w-full rounded-lg border border-landing-hairline bg-landing-surface px-3 text-[15px] text-foreground placeholder:text-muted-foreground transition-colors hover:bg-landing-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure-500/40 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50";

export const AUTH_LINK =
  "text-azure-600 hover:text-azure-700 dark:text-azure-400 dark:hover:text-azure-300";

export const PASSWORD_RULES_HINT =
  "At least 8 characters, with uppercase, lowercase, a number, and a special character.";

/** Mirrors backend registerSchema / resetPasswordSchema — UI only */
export function validatePassword(password) {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 100) return "Password must be at most 100 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character";
  return "";
}

export function validateEmail(email) {
  if (!email?.trim()) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email address";
  return "";
}

export function formatResendTimer(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
