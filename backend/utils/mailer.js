import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_NAME = process.env.MAIL_FROM_NAME || 'Finty';
const FROM_EMAIL = process.env.MAIL_FROM_EMAIL; // precisa ser o Single Sender verificado

function assertEnv() {
  if (!SENDGRID_API_KEY) throw new Error('Falta SENDGRID_API_KEY');
  if (!FROM_EMAIL) throw new Error('Falta MAIL_FROM_EMAIL');
}

async function sgSend({ to, subject, html, text }) {
  assertEnv();
  const payload = {
    personalizations: [{ to: [{ email: Array.isArray(to) ? to[0] : to }] }],
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject,
    content: [
      ...(text ? [{ type: 'text/plain', value: text }] : []),
      ...(html ? [{ type: 'text/html', value: html }] : []),
    ],
  };

  const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (resp.status === 202) return { ok: true };
  const body = await resp.text().catch(() => '');
  throw new Error(`SENDGRID_ERROR ${resp.status}: ${body}`);
}

export async function sendMail({ to, subject, html, text }) {
  return sgSend({ to, subject, html, text });
}

export async function verifyMailer() {
  try {
    await sgSend({
      to: FROM_EMAIL,
      subject: 'ping',
      text: 'ok',
    });
    console.log('[MAIL] SendGrid OK');
    return true;
  } catch (e) {
    console.warn('[MAIL] SendGrid falhou:', e?.message || e);
    return false;
  }
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
  await sendMail({ to, subject: 'Confirme seu e-mail', html });
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
  await sendMail({ to, subject: 'Redefinição de senha', html });
}