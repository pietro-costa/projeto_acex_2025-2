import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST || 'smtp.gmail.com';
const port = Number(process.env.SMTP_PORT || 465);
const secure =
  String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;

const user = process.env.GMAIL_USER;
const pass = process.env.GMAIL_PASS;

if (!user || !pass) {
  console.warn('[MAIL] GMAIL_USER/GMAIL_PASS não configurados – envio desativado.');
}

export const mailer = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: user && pass ? { user, pass } : undefined,
  family: 4,
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 40000,
  requireTLS: !secure,
  tls: { minVersion: 'TLSv1.2', servername: host },
});

async function sendWithRetry(opts, maxRetries = 2) {
  let attempt = 0;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  while (true) {
    try {
      return await mailer.sendMail(opts);
    } catch (e) {
      const code = e?.code || e?.errno || '';
      const transient =
        code === 'ETIMEDOUT' ||
        code === 'ESOCKET' ||
        code === 'ECONNECTION' ||
        code === 'ECONNRESET';
      if (!transient || attempt >= maxRetries) throw e;
      attempt += 1;
      const delay = 800 * attempt; // 800ms, 1600ms
      console.warn(`[MAIL] tentativa ${attempt} falhou (${code}). Retentando em ${delay}ms...`);
      await sleep(delay);
    }
  }
}

function fromHeader() {
  const name = process.env.MAIL_FROM_NAME || 'Equipe Finty';
  const email = process.env.MAIL_FROM_EMAIL || user || 'no-reply@example.com';
  return `"${name}" <${email}>`;
}

export async function sendVerificationEmail(to, verifyUrl) {
  const html = `
    <div style="font-family:Arial,sans-serif">
      <h2>Confirme seu e-mail</h2>
      <p>Clique no botão abaixo para verificar seu e-mail e ativar sua conta:</p>
      <p><a href="${verifyUrl}" style="display:inline-block;padding:10px 16px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px">Verificar e-mail</a></p>
      <p>Ou copie e cole este link no navegador:<br>${verifyUrl}</p>
      <p style="color:#6b7280;font-size:12px">Se você não criou uma conta, ignore esta mensagem.</p>
    </div>
  `;
  await sendWithRetry({
    from: fromHeader(),
    to,
    subject: 'Confirme seu e-mail',
    html,
  });
}

export async function sendPasswordResetEmail(to, resetUrl) {
  const ttl = Number(process.env.RESET_TOKEN_TTL_MINUTES || 60);
  const html = `
    <div style="font-family:Arial,sans-serif">
      <h2>Redefinição de senha</h2>
      <p>Clique no botão abaixo para redefinir sua senha. O link expira em ${ttl} minutos.</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#111827;color:#fff;text-decoration:none;border-radius:8px">Redefinir senha</a></p>
      <p>Ou copie e cole este link no navegador:<br>${resetUrl}</p>
      <p style="color:#6b7280;font-size:12px">Se você não solicitou isso, ignore esta mensagem.</p>
    </div>
  `;
  await sendWithRetry({
    from: fromHeader(),
    to,
    subject: 'Redefinição de senha',
    html,
  });
}