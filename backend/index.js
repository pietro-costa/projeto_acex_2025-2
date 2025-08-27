import * as dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import { pool } from './db/pool.js';


const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  const hasEnv =
    !!process.env.DATABASE_URL ||
    (!!process.env.PGHOST && !!process.env.PGUSER && !!process.env.PGDATABASE);

  try {
    const { rows } = await pool.query('select 1 as ok');
    res.json({ ok: rows?.[0]?.ok === 1, hasEnv });
  } catch (e) {
    console.error('HEALTH DB ERROR ->', e);
    res.status(500).json({ ok: false, code: e.code, message: e.message, hasEnv });
  }
});

app.post('/api/usuarios', async (req, res) => {
  try {
    const { nome, email, senha, renda_fixa, gastos_fixos, meta_economia } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'nome, email e senha são obrigatórios' });
    }

    // torna robusto contra "2500,00" etc.
    const toNum = (v) =>
      v === undefined || v === null || v === '' ? 0 : Number(String(v).replace(',', '.'));

    const { rows } = await pool.query(
      `insert into usuario (nome, email, senha, renda_fixa, gastos_fixos, meta_economia)
       values ($1, $2, $3, $4, $5, $6)
       returning id_usuario`,
      [nome, email, senha, toNum(renda_fixa), toNum(gastos_fixos), toNum(meta_economia)]
    );

    res.status(201).json({ id_usuario: rows[0].id_usuario });
  } catch (e) {
    console.error('❌ Erro ao criar usuário:', e); // <— veja o terminal

    // Em dev, devolva detalhes para depurar rapidamente
    return res.status(500).json({
      error: 'Erro ao criar usuário',
      code: e.code,
      detail: e.detail,
      message: e.message
    });
  }
});

app.get('/api/usuarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('select * from usuario where id_usuario = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// ---------- STUBS TEMPORÁRIOS p/ a Home não quebrar ----------
const CATS_PADRAO = [
  { id_categoria: 1, nome_categoria: 'Salário', tipo: 'receita' },
  { id_categoria: 2, nome_categoria: 'Freelance', tipo: 'receita' },
  { id_categoria: 3, nome_categoria: 'Alimentação', tipo: 'despesa' },
  { id_categoria: 4, nome_categoria: 'Transporte',  tipo: 'despesa' },
  { id_categoria: 5, nome_categoria: 'Moradia',     tipo: 'despesa' },
];

// compatível com o front antigo (/:id_usuario)
app.get('/api/categorias/:id_usuario', (_req, res) => res.json(CATS_PADRAO));
app.get('/api/categorias', (_req, res) => res.json(CATS_PADRAO)); // fallback

app.get('/api/transacoes/:id_usuario', (_req, res) => res.json([])); // lista vazia
app.get('/api/analytics/sum-by-category/:id_usuario', (_req, res) => res.json([])); // gráfico vazio

const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log(`API ouvindo em http://localhost:${port}`));