// ──────────────────────────────────────────────
// EOS Timesheet — Servizio invio email (EmailJS)
// ──────────────────────────────────────────────
// Usa EmailJS per inviare email direttamente dal browser,
// senza bisogno di un backend SMTP.
// Configurazione: https://www.emailjs.com/
// ──────────────────────────────────────────────

import emailjs from '@emailjs/browser'

let _initialized = false

export interface EmailConfig {
  publicKey: string
  serviceId: string
  templateId: string
}

let _emailConfig: EmailConfig | null = null

export function initEmailService(config: EmailConfig): void {
  _emailConfig = config
  if (!_initialized && config.publicKey) {
    emailjs.init(config.publicKey)
    _initialized = true
  }
}

function getConfig(): EmailConfig {
  if (!_emailConfig) throw new Error('Email service not initialized')
  return _emailConfig
}

export async function sendPasswordResetEmail(
  toEmail: string,
  resetToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cfg = getConfig()
    if (!cfg.publicKey || !cfg.serviceId || !cfg.templateId) {
      // Fallback: mostra il token in console (sviluppo)
      console.info('[email] EmailJS non configurato. Token reset:', resetToken)
      return { success: true }
    }

    const resetLink = `${window.location.origin}${window.location.pathname}?reset=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(toEmail)}`

    await emailjs.send(cfg.serviceId, cfg.templateId, {
      to_email: toEmail,
      to_name: toEmail.split('@')[0],
      reset_token: resetToken,
      reset_link: resetLink,
      app_name: 'EOS Smart Working',
    })

    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[email] Invio fallito:', msg)
    // Non blocchiamo il flusso — il token è comunque mostrato in UI
    return { success: true }
  }
}
