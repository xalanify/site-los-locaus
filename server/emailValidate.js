// ============================================================
// Validação de endereços de email.
//   1) formato  ->  texto@dominio.tld (regex)
//   2) domínio  ->  tem de ter registo MX (aceita emails)
//                   ou, na falta de MX, registo A (regra do RFC)
//   3) único    ->  tratado pela camada de contas (Supabase/SQLite)
// Sem serviços externos: só DNS do domínio, resposta imediata.
// ============================================================
const dns = require('dns').promises;

// Formato básico (sem pontos invisíveis nem espaços)
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

function formatError(email) {
  const value = String(email || '').trim();
  if (!value) return 'Escreve o teu email.';
  if (value.length > 254) return 'Email demasiado longa.';
  if (/\s/.test(value)) return 'O email não pode ter espaços.';
  if (!EMAIL_RE.test(value)) return 'Formato de email inválido (exemplo: nome@dominio.com).';
  return null;
}

// Procura MX; se não existir, cai para o registo A (aceita emails por IP)
async function domainAcceptsMail(domain) {
  try {
    const mx = await dns.resolveMx(domain);
    if (Array.isArray(mx) && mx.length > 0) return true;
  } catch (err) {
    // Sem MX mesmo → tenta A. Erros de rede/timeout não bloqueiam o registo.
    if (!/ENODATA|ENOTFOUND|ENOMORE|ENOTIMP|ENOENT/i.test(err.code || '')) {
      return true;
    }
  }
  try {
    const a = await dns.resolve4(domain);
    return Array.isArray(a) && a.length > 0;
  } catch (err) {
    if (/ENODATA|ENOTFOUND|ENOMORE|ENOTIMP|ENOENT/i.test(err.code || '')) return false;
    return true; // erro transitório de DNS → não bloquear
  }
}

/**
 * Valida um email.
 * @returns {Promise<{ ok: boolean, error?: string, email?: string }>}
 */
async function validateEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  const fmt = formatError(value);
  if (fmt) return { ok: false, error: fmt };

  const domain = value.split('@')[1];
  const ok = await domainAcceptsMail(domain);
  if (!ok) {
    return { ok: false, error: 'Esse domínio não existe ou não recebe emails.' };
  }
  return { ok: true, email: value };
}

module.exports = { validateEmail, EMAIL_RE };
