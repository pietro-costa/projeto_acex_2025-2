import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { pool } from './db/pool.js';
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { mailer, sendVerificationEmail, sendPasswordResetEmail } from './utils/mailer.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES;

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const [scheme, token] = h.split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'token ausente' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'token inválido' });
  }
}

function sameUserParam(paramName) {
  return (req, res, next) => {
    const idFromParam = Number(req.params[paramName]);
    if (!Number.isFinite(idFromParam)) return res.status(400).json({ error: 'id inválido' });
    const idFromToken = Number(req.user?.sub);
    if (idFromParam !== idFromToken) return res.status(403).json({ error: 'forbidden' });
    return next();
  };
}

const app = express();
app.set("trust proxy", 1);
const allowed = [process.env.FRONT_URL].filter(Boolean);
app.use(cors({
  origin: (origin, cb) => cb(null, true),
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.options("*", cors());
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json());


const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 50,                  // até 50 req por IP/janela
  standardHeaders: true,
  legacyHeaders: false,
});

const toNum = (v) =>
  v === undefined || v === null || v === '' ? 0 : Number(String(v).replace(',', '.'));
const isTipo = (s) => s === 'receita' || s === 'despesa';

app.get('/api/health', async (_req, res) => {
  try {
    const { rows } = await pool.query('select 1 as ok');
    return res.json({ ok: rows?.[0]?.ok === 1 });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'erro' });
  }
});

app.post('/api/usuarios', async (req, res) => {
  const client = await pool.connect();
  try {
    const { nome, email, senha, confirm_senha, renda_fixa = 0, gastos_fixos = 0, dia_pagamento = 0, saldo_atual = 0, meta_economia = 0 } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'nome, email e senha são obrigatórios' });
    }

    if (typeof confirm_senha !== 'string' || senha !== confirm_senha) {
      return res.status(400).json({ error: 'As senhas não coincidem.' });
    }

    if (String(senha).length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    const senha_hash = await bcrypt.hash(String(senha), 10);

    const saldoInicial = Number(saldo_atual) > 0 ? Number(saldo_atual) : 0;

    const token = newVerificationToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24hrs

    const insertSql = `
      INSERT INTO "usuario"
        (nome, email, senha, renda_fixa, gastos_fixos, dia_pagamento, saldo_inicial, meta_economia, email_verificado, token_verificacao, token_expires_at)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,FALSE,$9,$10)
      RETURNING id_usuario, email
    `;
    const insertValues = [
      nome,
      email,
      senha_hash,
      typeof toNum === 'function' ? toNum(renda_fixa) : Number(renda_fixa || 0),
      typeof toNum === 'function' ? toNum(gastos_fixos) : Number(gastos_fixos || 0),
      typeof toNum === 'function' ? toNum(dia_pagamento) : Number(gastos_fixos || 0),
      typeof toNum === 'function' ? toNum(saldo_atual) : Number(gastos_fixos || 0),
      typeof toNum === 'function' ? toNum(meta_economia) : Number(meta_economia || 0),
      token,
      expiresAt,
    ];

    const { rows } = await client.query(insertSql, insertValues);
    const user = rows[0];

    const verifyUrl = `${process.env.APP_URL}/api/verify/${token}`;
    try{
      await sendVerificationEmail(user.email, verifyUrl);
    } catch (e) {
      console.warn('Falha ao enviar e-mail de verificação:', e?.code || e?.message || e);
    }

    if (saldoInicial > 0) {
      const { rows: cat } = await pool.query(`
        select id_categoria from categoria
        where nome_categoria = 'Ajuste Inicial' and tipo = 'receita' and sistema = true
        limit 1
      `);
      if (cat.length) {
        const ym = new Date().toISOString().slice(0, 7);
        const { rows: exists } = await pool.query(`
          select 1
          from transacao t
          join categoria c on c.id_categoria = t.id_categoria
          where t.id_usuario = $1
            and c.nome_categoria = 'Ajuste Inicial'
            and c.tipo = 'receita'
            and to_char(t.data_transacao,'YYYY-MM') = $2
            and t.valor = $3
          limit 1
        `, [user.id_usuario, ym, saldoInicial]);
        if (!exists.length) {
          await pool.query(`
            insert into transacao (id_usuario, id_categoria, descricao, valor, data_transacao, tipo)
            values ($1, $2, $3, $4, CURRENT_DATE, 'receita')
          `, [user.id_usuario, cat[0].id_categoria, 'Ajuste de saldo (onboarding)', saldoInicial]);
        }
      }
    }

    return res.status(201).json({
      id_usuario: user.id_usuario,
      message: 'Usuário criado. Enviamos um e-mail de verificação.',
    });

  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }
    console.error('POST /api/usuarios erro:', e);
    return res.status(500).json({ error: 'Erro ao criar o usuário' });
  } finally {
    client.release();
  }
});

app.get('/api/verify/:token', async (req, res) => {
  const client = await pool.connect();
  try {
    const { token } = req.params;

    const select = `
      SELECT id_usuario, token_expires_at
      FROM "usuario"
      WHERE token_verificacao = $1 AND email_verificado = FALSE
      LIMIT 1
    `;
    const { rows } = await client.query(select, [token]);
    if (rows.length === 0) return res.status(400).send('Token inválido ou já utilizado.');

    const { id_usuario, token_expires_at } = rows[0];
    if (new Date(token_expires_at) < new Date()) {
      return res.status(400).send('Token expirado. Solicite um novo e-mail de verificação.');
    }

    const update = `
      UPDATE "usuario"
      SET email_verificado = TRUE, token_verificacao = NULL, token_expires_at = NULL
      WHERE id_usuario = $1
    `;
    await client.query(update, [id_usuario]);

    const front = process.env.FRONT_URL;
    return res.redirect(`${front}/?verified=1`);
  } catch (e) {
    console.error(e);
    res.status(500).send('Erro ao verificar e-mail.');
  } finally {
    client.release();
  }
});

app.get('/api/password-reset/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const { rows } = await pool.query(
      `select id_usuario
         from "usuario"
        where reset_token = $1
          and reset_expires_at > NOW()
        limit 1`,
      [token]
    );
    if (!rows?.length) {
      return res.redirect(`${process.env.FRONT_URL}/reset?status=invalid`);
    }
    return res.redirect(`${process.env.FRONT_URL}/reset?token=${encodeURIComponent(token)}`);
  } catch (e) {
    console.error('[PASSWORD RESET GET]', e);
    return res.redirect(`${process.env.FRONT_URL}/reset?status=invalid`);
  }
});

function newVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

app.post('/api/usuarios/resend-verification', authLimiter, async (req, res) => {
  const client = await pool.connect();
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'email é obrigatório' });

    const q = `
      SELECT id_usuario, email, email_verificado
      FROM usuario
      WHERE lower(email) = $1
      LIMIT 1
    `;
    const { rows } = await client.query(q, [email]);

    const genericOk = { message: 'Se existir uma conta com este e-mail, enviaremos um novo link.' };

    if (!rows.length) {
      return res.json(genericOk);
    }

    const user = rows[0];
    if (user.email_verificado) {
      return res.json(genericOk);
    }

    const token = newVerificationToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24hrs

    await client.query(
      `UPDATE usuario
         SET token_verificacao = $1, token_expires_at = $2
       WHERE id_usuario = $3`,
      [token, expiresAt, user.id_usuario]
    );

    const verifyUrl = `${process.env.APP_URL}/api/verify/${token}`;
    try {
      await sendVerificationEmail(user.email, verifyUrl);
    } catch (e) {
      console.warn('[MAIL] reenvio falhou:', e?.code || e?.message || e);
    }

    return res.json({ message: 'Novo e-mail de verificação enviado.' });
  } catch (e) {
    console.error('[RESEND VERIFY ERROR]', e);
    return res.status(500).json({ error: 'Erro ao reenviar verificação' });
  } finally {
    client.release();
  }
});

app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const senha = String(req.body?.senha || '');

    if (!email || !senha) {
      return res.status(400).json({ error: 'email e senha são obrigatórios' });
    }

    const q = `
      SELECT id_usuario, nome, email, senha, email_verificado
      FROM "usuario"
      WHERE lower(email) = $1
      LIMIT 1
    `;
    const { rows } = await pool.query(q, [email]);
    if (!rows.length) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "E-mail ou senha incorretos." });
    }

    const user = rows[0];

    if (!user.email_verificado) {
      return res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'E-mail não verificado. Verifique seu e-mail ou solicite novo envio.'
      });
    }

    const ok = await bcrypt.compare(senha, user.senha);
    if (!ok) {
      return res.status(401).json({ error: 'credenciais inválidas' });
    }

    const token = jwt.sign(
      { sub: user.id_usuario, nome: user.nome, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    return res.json({
      token,
      user: {
        id_usuario: user.id_usuario,
        nome: user.nome,
        email: user.email
      }
    });
  } catch (e) {
    console.error('[LOGIN ERROR]', e);
    return res.status(500).json({ error: 'erro no login' });
  }
});

app.post('/api/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;

  const okResponse = {
    ok: true,
    message: 'Se encontrarmos uma conta com este e-mail, enviaremos um link para redefinir a senha.'
  };

  if (!email || !String(email).includes('@')) {
    return res.json(okResponse);
  }

  try {
    const ttl = Number(process.env.RESET_TOKEN_TTL_MINUTES || 60); // minutos
    const token = crypto.randomBytes(32).toString('hex');

    // Atualiza token/expiração apenas se a conta existir
    const { rowCount } = await pool.query(
      `update "usuario"
          set reset_token = $1,
              reset_expires_at = NOW() + ($2 || ' minutes')::interval
        where lower(email) = lower($3)`,
      [token, ttl, email]
    );

    // Só envia o e-mail se alguma linha foi atualizada (conta existe)
    if (rowCount > 0) {
      const resetUrl = `${process.env.APP_URL}/api/password-reset/${token}`;
      try {
        await sendPasswordResetEmail(email, resetUrl);
      } catch (err) {
        console.error('[FORGOT PASSWORD][MAILER]', err.stack || err.message);
      }
    }

    return res.json(okResponse);
  } catch (e) {
    console.error('[FORGOT PASSWORD]', e.stack || e.message);
    return res.json(okResponse);
  }
});

app.post('/api/password-reset', authLimiter, async (req, res) => {
  const { token, senha, confirm_senha } = req.body;

  if (!token || !senha || !confirm_senha) {
    return res.status(400).json({ error: 'Dados incompletos.' });
  }
  if (senha !== confirm_senha) {
    return res.status(400).json({ error: 'As senhas não conferem.' });
  }
  if (String(senha).length < 6) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    const hash = await bcrypt.hash(String(senha), 10);

    const { rowCount } = await pool.query(
      `update "usuario"
          set senha = $1,
              reset_token = null,
              reset_expires_at = null
        where reset_token = $2
          and reset_expires_at > NOW()`,
      [hash, token]
    );

    if (rowCount === 0) {
      return res.status(400).json({ error: 'Token inválido ou expirado.' });
    }
    return res.json({ ok: true });
  } catch (e) {
    console.error('[PASSWORD RESET POST]', e);
    return res.status(500).json({ error: 'Erro ao redefinir senha.' });
  }
});

app.get('/api/usuarios/:id', auth, sameUserParam('id'), async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('select * from usuario where id_usuario = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(rows[0]);
  } catch (e) {
    console.error('GET /api/usuarios/:id erro:', e);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

app.patch('/api/usuarios/:id', auth, sameUserParam('id'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id inválido' });

    const {
      nome,
      renda_fixa,
      gastos_fixos,
      meta_economia,
      dia_pagamento,
      senha
    } = req.body ?? {};

    const toNum = (v) => {
      const n = Number(typeof v === 'string' ? v.replace?.(',', '.') : v);
      return Number.isFinite(n) ? n : 0;
    };

    const sets = [];
    const vals = [];
    let i = 1;

    if (nome !== undefined) { sets.push(`nome = $${i++}`); vals.push(String(nome).trim()); }
    if (renda_fixa !== undefined) { sets.push(`renda_fixa = $${i++}`); vals.push(toNum(renda_fixa)); }
    if (gastos_fixos !== undefined) { sets.push(`gastos_fixos = $${i++}`); vals.push(toNum(gastos_fixos)); }
    if (meta_economia !== undefined) { sets.push(`meta_economia = $${i++}`); vals.push(toNum(meta_economia)); }
    if (dia_pagamento !== undefined) {
      const dp = Math.max(1, Math.min(30, Number(dia_pagamento) || 1));
      sets.push(`dia_pagamento = $${i++}`); vals.push(dp);
    }
    if (senha !== undefined) {
      const senha_hashed = await bcrypt.hash(String(senha), 10);
      sets.push(`senha = $${i++}`); vals.push(senha_hashed);
    }

    if (!sets.length) return res.status(400).json({ error: 'Nada para atualizar' });

    const sql = `
      update usuario
         set ${sets.join(', ')}
       where id_usuario = $${i}
      returning id_usuario, nome, email, renda_fixa, gastos_fixos, meta_economia, dia_pagamento, created_at
    `;
    vals.push(id);

    const { rows } = await pool.query(sql, vals);
    return res.json({ ok: true, user: rows[0] });
  } catch (e) {
    console.error('PATCH /api/usuarios/:id erro:', e);
    return res.status(500).json({ error: 'Falha ao atualizar usuário' });
  }
});

async function handleListCategorias(req, res) {
  try {
    const tipo = req.query?.tipo;

    if (tipo === 'despesa' || tipo === 'receita') {
      const { rows } = await pool.query(
        `select id_categoria, nome_categoria, tipo
           from categoria
          where tipo = $1
            and sistema = false
          order by
            case when nome_categoria = 'Outros' then 1 else 0 end,
            nome_categoria`,
        [tipo]
      );
      return res.json(rows);
    }

    const { rows } = await pool.query(
      `select id_categoria, nome_categoria, tipo
         from categoria
        where sistema = false
        order by
          tipo,
          case when nome_categoria = 'Outros' then 1 else 0 end,
          nome_categoria`
    );
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'erro ao listar categorias' });
  }
}

app.get('/api/categorias', handleListCategorias);

app.post('/api/transacoes', auth, async (req, res) => {
  try {
    const {
      id_usuario,
      id_categoria,
      descricao,
      valor,
      data_transacao,
      tipo: tipoBody,
    } = req.body ?? {};

    if (Number(id_usuario) !== Number(req.user?.sub)) {
      return res.status(403).json({ error: 'forbidden' });
    }

    if (!id_usuario || !id_categoria || !valor || !data_transacao) {
      return res.status(400).json({ error: 'id_usuario, id_categoria, valor e data_transacao são obrigatórios' });
    }

    // pega a categoria e valida o tipo
    const { rows: catRows } = await pool.query(
      'select id_categoria, tipo from categoria where id_categoria = $1',
      [id_categoria]
    );
    if (!catRows.length) return res.status(400).json({ error: 'categoria inválida' });

    const tipoCategoria = catRows[0].tipo;
    const tipo =
      (tipoBody === 'despesa' || tipoBody === 'receita') ? tipoBody : tipoCategoria;

    if (tipo !== tipoCategoria) {
      return res.status(400).json({ error: 'tipo não corresponde à categoria escolhida' });
    }

    const valorNum = typeof valor === 'number'
      ? valor
      : Number(String(valor).replace(/\./g, '').replace(',', '.'));

    const sql = `
      insert into transacao (id_usuario, id_categoria, descricao, valor, data_transacao, tipo)
      values ($1, $2, $3, $4, $5, $6)
      returning id_transacao
    `;
    const { rows } = await pool.query(sql, [
      id_usuario,
      id_categoria,
      descricao ?? null,
      valorNum,
      data_transacao,
      tipo,
    ]);

    return res.status(201).json({ id_transacao: rows[0].id_transacao });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'erro ao criar transação' });
  }
});

app.get('/api/transacoes/:id_usuario', auth, sameUserParam('id_usuario'), async (req, res) => {
  try {
    const { id_usuario } = req.params;
    const { tipo } = req.query;
    if (tipo && !isTipo(tipo)) return res.status(400).json({ error: 'tipo inválido' });

    const args = [id_usuario];
    let sql = `
      select t.id_transacao, t.id_usuario, t.id_categoria, c.nome_categoria, t.descricao,
             t.valor, t.tipo, t.data_transacao
      from transacao t
      join categoria c on c.id_categoria = t.id_categoria
      where t.id_usuario = $1
    `;
    if (tipo) { sql += ' and t.tipo = $2'; args.push(tipo); }
    sql += ' order by t.data_transacao desc, t.id_transacao desc';

    const { rows } = await pool.query(sql, args);
    res.json(rows);
  } catch (e) {
    console.error('GET /api/transacoes/:id_usuario erro:', e);
    res.status(500).json({ error: 'Erro ao listar transações' });
  }
});

app.post('/api/mensal/garantir', auth, async (req, res) => {
  try {
    const id_usuario = Number(req.user?.sub);
    const { ym } = req.body || {};
    const now = new Date();
    const ymAlvo = (typeof ym === 'string' && /^\d{4}-\d{2}$/.test(ym))
      ? ym
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Serializa execuções concorrentes por usuário (evita duplicidade)
    await pool.query('select pg_advisory_xact_lock($1, $2)', [42, id_usuario]);

    // Categorias do sistema
    const { rows: cat } = await pool.query(`
      select id_categoria, nome_categoria, tipo
      from categoria
      where sistema = true
    `);
    const catId = (nome, tipo) => cat.find(c => c.nome_categoria === nome && c.tipo === tipo)?.id_categoria;

    // Parâmetros do usuário + data de criação + saldo inicial
    const { rows: urows } = await pool.query(`
      select
        coalesce(renda_fixa,0)::numeric    as renda_fixa,
        coalesce(gastos_fixos,0)::numeric  as gastos_fixos,
        coalesce(dia_pagamento,1)::int     as dia_pagamento,
        coalesce(saldo_inicial,0)::numeric as saldo_inicial,
        created_at
      from usuario
      where id_usuario = $1
    `, [id_usuario]);
    if (!urows.length) return res.status(404).json({ error: 'usuario não encontrado' });
    const { renda_fixa, gastos_fixos, dia_pagamento, saldo_inicial, created_at } = urows[0];

    // Helpers de datas
    const toYM = (d) => {
      const dt = new Date(d);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    };
    const ymPrev = (yymm) => {
      const [y, m] = yymm.split('-').map(Number);
      const d = new Date(y, m - 1, 1);
      d.setMonth(d.getMonth() - 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    const ymNext = (yymm) => {
      const [y, m] = yymm.split('-').map(Number);
      const d = new Date(y, m - 1, 1);
      d.setMonth(d.getMonth() + 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    const ajustarDiaParaMes = (diaDesejado, yymm) => {
      const [ano, mes] = yymm.split('-').map(Number);
      const ultimoDia = new Date(ano, mes, 0).getDate();
      return Math.min(Number(diaDesejado) || 1, ultimoDia);
    };

    const ymHoje = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const isMesAtual = ymAlvo === ymHoje;

    // === Lógica do PRIMEIRO CICLO ===
    const ymCriacao = toYM(created_at);
    const diaCriacao = new Date(created_at).getDate();
    const diaPagCriacaoCorrigido = ajustarDiaParaMes(dia_pagamento, ymCriacao);

    // Primeiro ciclo = primeiro dia_pagamento >= data de criação
    const firstCycleYM = (diaCriacao <= diaPagCriacaoCorrigido) ? ymCriacao : ymNext(ymCriacao);

    const isOnboardingMonth = (ymAlvo === ymCriacao);
    const isFirstCycleMonth = (ymAlvo === firstCycleYM);
    const afterFirstCycle = ( // ymAlvo > firstCycleYM (comparação de ano-mês)
      Number(ymAlvo.slice(0, 4)) > Number(firstCycleYM.slice(0, 4)) ||
      (ymAlvo.slice(0, 4) === firstCycleYM.slice(0, 4) && Number(ymAlvo.slice(5, 7)) > Number(firstCycleYM.slice(5, 7)))
    );

    // (0) Onboarding: garantir Ajuste Inicial se ainda não existir
    if (isOnboardingMonth && Number(saldo_inicial) > 0) {
      const { rows: catAj } = await pool.query(`
        select id_categoria from categoria
        where nome_categoria = 'Ajuste Inicial' and tipo = 'receita' and sistema = true
        limit 1
      `);
      if (catAj.length) {
        const { rows: exAj } = await pool.query(`
          select 1
          from transacao t
          join categoria c on c.id_categoria = t.id_categoria
          where t.id_usuario = $1
            and c.nome_categoria = 'Ajuste Inicial'
            and c.tipo = 'receita'
            and to_char(t.data_transacao,'YYYY-MM') = $2
            and t.valor = $3
          limit 1
        `, [id_usuario, ymAlvo, Number(saldo_inicial)]);
        if (!exAj.length) {
          await pool.query(`
            insert into transacao (id_usuario, id_categoria, descricao, valor, data_transacao, tipo)
            values ($1, $2, $3, $4, CURRENT_DATE, 'receita')
          `, [id_usuario, catAj[0].id_categoria, 'Ajuste de saldo (onboarding)', Number(saldo_inicial)]);
        }
      }
    }

    // (1) Carryover: só APÓS o primeiro ciclo (no mês seguinte ao firstCycle)
    const ymAnterior = ymPrev(ymAlvo);
    if (afterFirstCycle) {
      // somas reais do mês anterior
      const { rows: aggPrev } = await pool.query(`
        select
          coalesce(sum(case when tipo='receita' then valor else 0 end),0)::numeric as receitas,
          coalesce(sum(case when tipo='despesa' then valor else 0 end),0)::numeric as despesas
        from transacao
        where id_usuario = $1
          and to_char(data_transacao,'YYYY-MM') = $2
      `, [id_usuario, ymAnterior]);
      const receitasPrev = Number(aggPrev[0].receitas);
      const despesasPrev = Number(aggPrev[0].despesas);

      const saldoPrev = (Number(renda_fixa) + receitasPrev) - (Number(gastos_fixos) + despesasPrev);

      if (saldoPrev !== 0) {
        const firstDay = `${ymAlvo}-01`;
        const tipo = saldoPrev > 0 ? 'receita' : 'despesa';
        const valor = Math.abs(saldoPrev);
        const catSaldo = catId('Saldo ao fim do mês anterior', tipo);
        if (catSaldo) {
          const { rows: exPrev } = await pool.query(`
            select 1
            from transacao t
            join categoria c on c.id_categoria = t.id_categoria
            where t.id_usuario = $1
              and c.nome_categoria = 'Saldo ao fim do mês anterior'
              and c.tipo = $2
              and t.data_transacao = $3::date
              and t.valor = $4
            limit 1
          `, [id_usuario, tipo, firstDay, valor]);
          if (!exPrev.length) {
            await pool.query(`
              insert into transacao (id_usuario, id_categoria, descricao, valor, data_transacao, tipo)
              values ($1, $2, $3, $4, $5::date, $6)
            `, [id_usuario, catSaldo, 'Saldo ao fim do mês anterior', valor, firstDay, tipo]);
          }
        }
      }
    }
    // (Se for onboarding ou firstCycleMonth, não cria carryover)

    // (2) Salário e Gastos Fixos:
    //  - No mês do onboarding: só se ESTE mês for o firstCycle e o dia_pagamento já tiver chegado.
    //  - No mês do firstCycle: idem (só quando chegar o dia).
    //  - Depois do firstCycle: regra normal (no mês atual, quando chegar o dia).
    const diaCorrigido = ajustarDiaParaMes(dia_pagamento, ymAlvo);
    const hojeDia = now.getDate();

    const podeLancarFixos =
      isMesAtual &&
      (isFirstCycleMonth || afterFirstCycle) &&
      (hojeDia >= diaCorrigido);

    if (podeLancarFixos && Number(renda_fixa) > 0) {
      const dataSalario = `${ymAlvo}-${String(diaCorrigido).padStart(2, '0')}`;
      const catSal = catId('Salário', 'receita');
      if (catSal) {
        const { rows: exSal } = await pool.query(`
          select 1
          from transacao t
          join categoria c on c.id_categoria = t.id_categoria
          where t.id_usuario = $1
            and c.nome_categoria = 'Salário'
            and c.tipo = 'receita'
            and t.data_transacao = $2::date
            and t.valor = $3
          limit 1
        `, [id_usuario, dataSalario, Number(renda_fixa)]);
        if (!exSal.length) {
          await pool.query(`
            insert into transacao (id_usuario, id_categoria, descricao, valor, data_transacao, tipo)
            values ($1, $2, $3, $4, $5::date, 'receita')
          `, [id_usuario, catSal, 'Salário do mês', Number(renda_fixa), dataSalario]);
        }
      }
    }

    if (podeLancarFixos && Number(gastos_fixos) > 0) {
      const dataGastos = `${ymAlvo}-${String(diaCorrigido).padStart(2, '0')}`;
      const catGf = catId('Gastos Fixos', 'despesa');
      if (catGf) {
        const { rows: exGf } = await pool.query(`
          select 1
          from transacao t
          join categoria c on c.id_categoria = t.id_categoria
          where t.id_usuario = $1
            and c.nome_categoria = 'Gastos Fixos'
            and c.tipo = 'despesa'
            and t.data_transacao = $2::date
            and t.valor = $3
          limit 1
        `, [id_usuario, dataGastos, Number(gastos_fixos)]);
        if (!exGf.length) {
          await pool.query(`
            insert into transacao (id_usuario, id_categoria, descricao, valor, data_transacao, tipo)
            values ($1, $2, $3, $4, $5::date, 'despesa')
          `, [id_usuario, catGf, 'Gastos fixos do mês', Number(gastos_fixos), dataGastos]);
        }
      }
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error('[GARANTIR MÊS]', e);
    return res.status(500).json({ error: 'Falha ao garantir mês' });
  }
});

app.put('/api/transacoes/:id_transacao', auth, async (req, res) => {
  try {
    const { id_transacao } = req.params;
    const { id_categoria, descricao, valor, data_transacao } = req.body ?? {};

    const q1 = await pool.query(
      'select id_usuario, tipo from transacao where id_transacao = $1',
      [id_transacao]
    );
    if (q1.rowCount === 0) return res.status(404).json({ error: 'transação não encontrada' });
    if (Number(q1.rows[0].id_usuario) !== Number(req.user?.sub)) {
      return res.status(403).json({ error: 'forbidden' });
    }

      let valorNum = undefined;
    if (valor !== undefined && valor !== null && valor !== '') {
      if (typeof valor === 'number') {
        valorNum = valor;
       } else {
         const s = String(valor).trim();
        const lastComma = s.lastIndexOf(',');
         const lastDot = s.lastIndexOf('.');
         let norm = s;

         if (lastComma > lastDot) {
           norm = s.replace(/\./g, '').replace(',', '.');
         } else if (lastDot > lastComma) {
           norm = s.replace(/,/g, '');
        } else {
          
           norm = s;
         }
         valorNum = Number(norm.replace(/[^\d.-]/g, ''));
       }
       if (!Number.isFinite(valorNum) || valorNum < 0) {
       return res.status(400).json({ error: 'valor inválido' });
       }
     }


    const sets = [];
    const args = [];
    let i = 1;

    if (id_categoria !== undefined) { sets.push(`id_categoria = $${i++}`); args.push(id_categoria); }
    if (descricao    !== undefined) { sets.push(`descricao = $${i++}`);    args.push(descricao ?? null); }
    if (valorNum     !== undefined) { sets.push(`valor = $${i++}`);        args.push(valorNum); }
    if (data_transacao !== undefined) { sets.push(`data_transacao = $${i++}`); args.push(data_transacao); }

    if (sets.length === 0) return res.status(400).json({ error: 'nenhum campo para atualizar' });

    args.push(id_transacao);
    const sql = `update transacao set ${sets.join(', ')} where id_transacao = $${i} returning *`;
    const { rows } = await pool.query(sql, args);

    return res.json(rows[0]);
  } catch (e) {
    console.error('PUT /api/transacoes/:id_transacao erro:', e);
    return res.status(500).json({ error: 'erro ao atualizar transação' });
  }
});


app.delete('/api/transacoes/:id_transacao', auth, async (req, res) => {
  try {
    const { id_transacao } = req.params;

  
    const q1 = await pool.query(
      'select id_usuario from transacao where id_transacao = $1',
      [id_transacao]
    );
    if (q1.rowCount === 0) return res.status(404).json({ error: 'transação não encontrada' });
    if (Number(q1.rows[0].id_usuario) !== Number(req.user?.sub)) {
      return res.status(403).json({ error: 'forbidden' });
    }

    await pool.query('delete from transacao where id_transacao = $1', [id_transacao]);
    return res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/transacoes/:id_transacao erro:', e);
    return res.status(500).json({ error: 'erro ao excluir transação' });
  }
});


app.get('/api/analytics/sum-by-category/:id_usuario', auth, sameUserParam('id_usuario'), async (req, res) => {
  try {
    const { id_usuario } = req.params;
    const { tipo } = req.query;
    if (tipo && !isTipo(tipo)) return res.status(400).json({ error: 'tipo inválido' });

    const args = [id_usuario];
    let sql = `
      select c.nome_categoria, t.tipo, sum(t.valor)::numeric(12,2) as total
      from transacao t
      join categoria c on c.id_categoria = t.id_categoria
      where t.id_usuario = $1
    `;
    if (tipo) { sql += ' and t.tipo = $2'; args.push(tipo); }
    sql += ' group by c.nome_categoria, t.tipo order by total desc';

    const { rows } = await pool.query(sql, args);
    res.json(rows);
  } catch (e) {
    console.error('GET /api/analytics/sum-by-category/:id_usuario erro:', e);
    res.status(500).json({ error: 'Erro ao calcular analytics' });
  }
});

app.get('/api/analytics/sum-by-day/:id_usuario', auth, sameUserParam('id_usuario'), async (req, res) => {
  try {
    const id_usuario = Number(req.params.id_usuario);
    if (!Number.isFinite(id_usuario)) {
      return res.status(400).json({ error: 'id_usuario inválido' });
    }

    const daysParam = Number(req.query.days ?? 7);
    const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 31) : 7;

    const { rows } = await pool.query(
      `
      with dias as (
        select generate_series(
          (current_date - ($2::int - 1) * interval '1 day')::date,
          current_date::date,
          interval '1 day'
        )::date AS dia
      )
      select
        to_char(d.dia, 'DD/MM') as label,
        coalesce(sum(t.valor), 0)::numeric(12,2) as total
      from dias d
      left join transacao t
        on t.id_usuario = $1
       and t.data_transacao::date = d.dia
       and t.tipo = 'despesa'
      group by d.dia
      order by d.dia;
      `,
      [id_usuario, days]
    );

    return res.json(rows);
  } catch (e) {
    console.error('GET /api/analytics/sum-by-day/:id_usuario erro:', e);
    return res.status(500).json({ error: 'Erro ao calcular analytics' });
  }
});

app.get('/api/analytics/sum-by-month/:id_usuario', auth, sameUserParam('id_usuario'), async (req, res) => {
  try {
    const id_usuario = Number(req.params.id_usuario);
    if (!Number.isFinite(id_usuario)) {
      return res.status(400).json({ error: 'id_usuario inválido' });
    }

    const monthsParam = Number(req.query.months ?? 6);
    const months = Number.isFinite(monthsParam) ? Math.min(Math.max(monthsParam, 1), 24) : 6;

    const { rows } = await pool.query(
      `
      with meses as (
        select generate_series(
          date_trunc('month', current_date) - (($2::int - 1) * interval '1 month'),
          date_trunc('month', current_date),
          interval '1 month'
        )::date as mes
      )
      select
        to_char(m.mes, 'MM/YYYY') as label,
        coalesce(sum(t.valor), 0)::numeric(12,2) as total
      from meses m
      left join transacao t
        on t.id_usuario = $1
       and t.data_transacao >= m.mes
       and t.data_transacao <  (m.mes + interval '1 month')
       and t.tipo = 'despesa'
      group by m.mes
      order by m.mes;
      `,
      [id_usuario, months]
    );

    return res.json(rows);
  } catch (e) {
    console.error('GET /api/analytics/sum-by-month erro:', e);
    return res.status(500).json({ error: 'Erro ao calcular analytics mensal' });
  }
});

app.get('/api/analytics/sum-by-year/:id_usuario', auth, sameUserParam('id_usuario'), async (req, res) => {
  try {
    const id_usuario = Number(req.params.id_usuario);
    if (!Number.isFinite(id_usuario)) {
      return res.status(400).json({ error: 'id_usuario inválido' });
    }

    const yearsParam = Number(req.query.years ?? 3);
    const years = Number.isFinite(yearsParam) ? Math.min(Math.max(yearsParam, 1), 10) : 3;

    const { rows } = await pool.query(
      `
      with anos as (
        select generate_series(
          date_trunc('year', current_date) - (($2::int - 1) * interval '1 year'),
          date_trunc('year', current_date),
          interval '1 year'
        )::date as ano
      )
      select
        to_char(a.ano, 'YYYY') as label,
        coalesce(sum(t.valor), 0)::numeric(12,2) as total
      from anos a
      left join transacao t
        on t.id_usuario = $1
       and t.data_transacao >= a.ano
       and t.data_transacao <  (a.ano + interval '1 year')
       and t.tipo = 'despesa'
      group by a.ano
      order by a.ano;
      `,
      [id_usuario, years]
    );

    return res.json(rows);
  } catch (e) {
    console.error('GET /api/analytics/sum-by-year erro:', e);
    return res.status(500).json({ error: 'Erro ao calcular analytics anual' });
  }
});

app.get('/api/analytics/account-stats/:id_usuario', auth, sameUserParam('id_usuario'), async (req, res) => {
  try {
    const id = Number(req.params.id_usuario);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id_usuario inválido' });

    const { rows } = await pool.query(
      `
      WITH base AS (
        SELECT u.created_at::date AS data_ref
        FROM usuario u
        WHERE u.id_usuario = $1
      ),
      agg_mes AS (
        SELECT
          COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0)::numeric(12,2) AS receitas_mes,
          COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0)::numeric(12,2) AS despesas_mes
        FROM transacao
        WHERE id_usuario = $1
          AND date_trunc('month', data_transacao) = date_trunc('month', CURRENT_DATE)
      )
      SELECT
        GREATEST(0, (CURRENT_DATE - (SELECT data_ref FROM base))::int) AS dias_conta,
        (SELECT COUNT(*) FROM transacao t WHERE t.id_usuario = $1)::int            AS total_gastos,
        (SELECT receitas_mes - despesas_mes FROM agg_mes)::numeric(12,2)           AS economia_mes
      `, 
      [id]
    );

    res.json(rows[0]);
  } catch (e) {
    console.error('GET /api/analytics/account-stats/:id_usuario erro:', e);
    res.status(500).json({ error: 'Falha ao calcular estatísticas' });
  }
});

const port = Number(process.env.PORT || 3001);

(async () => {
  try {
    await mailer.verify();
    console.log('[MAIL] SMTP OK');
  } catch (e) {
    console.warn('[MAIL] SMTP verify falhou:', e?.code || e?.message || e);
  }
})();
app.listen(port, () => console.log(`API ouvindo em http://localhost:${port}`));