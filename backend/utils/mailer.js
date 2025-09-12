import nodemailer from 'nodemailer';

export const mailer = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

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
  await mailer.sendMail({
    from: `"Equipe Finty" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Confirme seu e-mail',
    html,
  });
}
