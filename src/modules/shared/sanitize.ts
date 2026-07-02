// ──────────────────────────────────────────────
// EOS Timesheet — Sanitizzazione input utente
// ──────────────────────────────────────────────

/**
 * Sanitizza una stringa rimuovendo tag HTML e caratteri pericolosi.
 * Previene XSS quando si renderizza input utente nel DOM.
 */
export function sanitizeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * Sanitizza un nome utente: tronca a max 50 caratteri e rimuove HTML.
 */
export function sanitizeName(name: string): string {
  return sanitizeHtml(name.trim()).slice(0, 50)
}
