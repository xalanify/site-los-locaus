// ============================================================
// Envio de emails (recuperação de palavra-passe).
//   Ligar em server/.env:
//     SMTP_HOST=smtp.gmail.com
//     SMTP_PORT=587
//     SMTP_USER=tu@gmail.com
//     SMTP_PASS=xxxxxxxx        (App Password do Google)
//     SMTP_FROM="Ashow e Jazer <tu@gmail.com>"
//     SITE_URL=http://localhost:3001
//   Sem SMTP configurado o pedido NÃO falha: o link aparece na
//   consola do servidor para poderes testar localmente.
// ============================================================
const nodemailer = require('nodemailer');
const fetch = require('node-fetch');

const SITE_NAME = 'Ashow e Jazer';
const VIOLET = '#8B5CF6';
const VIOLET_DARK = '#7C3AED';

const resendKey = () => String(process.env.RESEND_API_KEY || '').trim();

const isConfigured = () =>
  Boolean(resendKey() || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS));

const siteUrl = () =>
  String(process.env.SITE_URL || 'http://localhost:3001').replace(/\/+$/, '');

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_PORT) === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

/* Email "esqueci a pass" — template alinhado com o design do site */
function recoveryHtml({ username, resetUrl, expiresInMin }) {
  const safeUser = String(username || '').replace(/[<>&"]/g, '');
  return `<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Recuperar palavra-passe — ${SITE_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#12121a;border:1px solid rgba(139,92,246,.28);border-radius:20px;overflow:hidden;">

        <!-- Cabeçalho -->
        <tr>
          <td style="background:linear-gradient(135deg,${VIOLET} 0%,${VIOLET_DARK} 100%);padding:26px 28px;">
            <div style="font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:rgba(255,255,255,.72);margin-bottom:8px;">
              ${SITE_NAME}
            </div>
            <div style="font-size:24px;font-weight:bold;color:#ffffff;line-height:1.2;">
              Recuperar palavra-passe
            </div>
          </td>
        </tr>

        <!-- Corpo -->
        <tr>
          <td style="padding:28px;">
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#d4d4dc;">
              Olá <strong style="color:#ffffff;">${safeUser}</strong>,
            </p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#d4d4dc;">
              Recebemos um pedido para alterar a palavra-passe da tua conta.
              Se não foste tu, podes ignorar este email — a tua pass fica como está.
            </p>

            <!-- Botão -->
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 8px;">
              <tr>
                <td style="background:${VIOLET};border-radius:12px;">
                  <a href="${resetUrl}"
                     style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">
                    Definir nova palavra-passe
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#8a8a99;">
              O link é válido durante <strong style="color:#a1a1b3;">${expiresInMin} minutos</strong>
              e só pode ser usado uma vez.
            </p>
          </td>
        </tr>

        <!-- Link de reserva -->
        <tr>
          <td style="padding:0 28px 26px;">
            <div style="border-top:1px solid rgba(255,255,255,.07);padding-top:18px;">
              <p style="margin:0 0 8px;font-size:12px;color:#6f6f7d;">Se o botão não funcionar, copia este link:</p>
              <a href="${resetUrl}" style="font-size:12px;color:${VIOLET};word-break:break-all;">${resetUrl}</a>
            </div>
          </td>
        </tr>

        <!-- Rodapé -->
        <tr>
          <td style="background:#0d0d14;padding:18px 28px;">
            <p style="margin:0;font-size:11px;color:#5c5c6b;line-height:1.6;">
              ${SITE_NAME} — site dos Locaus.<br/>
              Este email foi enviado porque pediste a recuperação da tua palavra-passe.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Envia o email de recuperação.
 *   1) RESEND_API_KEY  -> API do Resend (funciona sem domínio próprio)
 *   2) SMTP_*          -> qualquer outro provedor
 *   3) nenhum          -> modo local: link na consola (não falha)
 * @returns {Promise<{ ok: boolean, dev?: boolean, url?: string, error?: string }>}
 */
async function sendRecoveryEmail({ to, username, token, expiresInMin = 60 }) {
  const resetUrl = `${siteUrl()}/recuperar?token=${encodeURIComponent(token)}`;
  const html = recoveryHtml({ username, resetUrl, expiresInMin });
  const text =
    `Olá ${username},\n\n` +
    `Abre este link para definir uma nova palavra-passe (válido ${expiresInMin} min):\n` +
    `${resetUrl}\n\nSe não foste tu, ignora este email.`;
  const subject = `Recupera a tua palavra-passe — ${SITE_NAME}`;
  const from = process.env.EMAIL_FROM || `${SITE_NAME} <onboarding@resend.com>`;

  // 1) API do Resend — a forma mais simples (sem validar domínio)
  if (resendKey()) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to: [to], subject, html, text }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Resend ${res.status} — ${txt.slice(0, 160)}`);
      }
      return { ok: true, url: resetUrl };
    } catch (error) {
      console.error('Erro envio email (Resend):', error.message);
      return { ok: false, error: 'Não foi possível enviar o email. Tenta mais tarde.' };
    }
  }

  // 2) SMTP genérico (Gmail, Brevo, domínio próprio…)
  if (isConfigured()) {
    try {
      await getTransporter().sendMail({ from, to, subject, html, text });
      return { ok: true, url: resetUrl };
    } catch (error) {
      console.error('Erro envio email:', error.message);
      return { ok: false, error: 'Não foi possível enviar o email. Tenta mais tarde.' };
    }
  }

  // 3) Sem serviço configurado: não bloqueia, mostra o link na consola
  console.log('--- RECUPERAÇÃO (modo local, sem email configurado) ---');
  console.log(`Para: ${to} | Conta: ${username}`);
  console.log(`Link: ${resetUrl}`);
  console.log('-------------------------------------------------------');
  return { ok: true, dev: true, url: resetUrl };
}

module.exports = { sendRecoveryEmail, isConfigured, siteUrl };
