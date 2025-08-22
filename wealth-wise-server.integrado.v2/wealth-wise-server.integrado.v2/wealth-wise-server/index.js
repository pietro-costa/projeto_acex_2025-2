import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { pool } from './db/pool.js';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ ok: true, db: rows[0].ok === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Users
app.post('/api/usuarios', async (req, res) => {
  try {
    const { nome, email, cpf, renda_fixa, gastos_fixos, senha, senha_hash } = req.body || {};
    if (!nome || !email || !cpf || renda_fixa == null || gastos_fixos == null) {
      return res.status(400).json({ error: 'Campos obrigatórios: nome, email, cpf, renda_fixa, gastos_fixos' });
    }

    // Garante que nunca vamos inserir NULL na coluna senha_hash
    const senhaFinal = (typeof senha === 'string' && senha.length) ? senha
                      : (typeof senha_hash === 'string' && senha_hash.length) ? senha_hash
                      : '';

    const [result] = await pool.query(
      `INSERT INTO Usuario (nome, email, cpf, renda_fixa, gastos_fixos, senha_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nome, email, cpf, renda_fixa, gastos_fixos, senhaFinal]
    );

    res.status(201).json({ id_usuario: result.insertId });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});


app.get('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM Usuario WHERE id_usuario = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(rows[0]);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Categories
app.post('/api/categorias', async (req, res) => {
  const { nome_categoria, tipo, id_usuario } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO Categoria (nome_categoria, tipo, id_usuario) VALUES (?, ?, ?)`,
      [nome_categoria, tipo, id_usuario]
    );
    res.status(201).json({ id_categoria: result.insertId });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/categorias/:id_usuario', async (req, res) => {
  const { id_usuario } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM Categoria WHERE id_usuario = ?', [id_usuario]);
    res.json(rows);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Transactions
app.post('/api/transacoes', async (req, res) => {
  const { id_usuario, id_categoria, descricao, valor, tipo, data_transacao } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO Transacao (id_usuario, id_categoria, descricao, valor, tipo, data_transacao)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id_usuario, id_categoria, descricao ?? null, valor, tipo, data_transacao]
    );
    res.status(201).json({ id_transacao: result.insertId });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/transacoes/:id_usuario', async (req, res) => {
  const { id_usuario } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT t.*, c.nome_categoria, c.tipo AS tipo_categoria
       FROM Transacao t
       JOIN Categoria c ON c.id_categoria = t.id_categoria
       WHERE t.id_usuario = ?
       ORDER BY t.data_transacao DESC, t.id_transacao DESC`,
      [id_usuario]
    );
    res.json(rows);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Simple analytics (sum by category for charts)
app.get('/api/analytics/sum-by-category/:id_usuario', async (req, res) => {
  const { id_usuario } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT c.nome_categoria, c.tipo, SUM(t.valor) AS total
       FROM Transacao t
       JOIN Categoria c ON c.id_categoria = t.id_categoria
       WHERE t.id_usuario = ?
       GROUP BY c.nome_categoria, c.tipo
       ORDER BY total DESC`,
      [id_usuario]
    );
    res.json(rows);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
