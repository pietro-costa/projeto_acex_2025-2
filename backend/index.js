import express from 'express';
import cors from 'cors';
import { pool } from './db/pool.js';


const app = express();
app.use(cors());
app.use(express.json());

const toNum = (v) =>
  v === undefined || v === null || v === '' ? 0 : Number(String(v).replace(',','.'));
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
  try {
    const { nome, email, senha, renda_fixa, gastos_fixos, meta_economia } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'nome, email e senha são obrigatórios' });
    }

    const { rows } = await pool.query(
      `insert into usuario (nome, email, senha, renda_fixa, gastos_fixos, meta_economia)
       values ($1, $2, $3, $4, $5, $6)
       returning id_usuario`,
      [nome, email, senha, toNum(renda_fixa), toNum(gastos_fixos), toNum(meta_economia)]
    );

    res.status(201).json({ id_usuario: rows[0].id_usuario });
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }
    console.error('POST /api/usuarios erro:', e);
    res.status(500).json({ error: 'Erro ao criar o usuário' });
  }
});

app.get('/api/usuarios/:id', async (req, res) => {
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

async function handleListCategorias(req, res) {
  try {
    const { tipo } = req.query;
    if (tipo && !isTipo(tipo)) return res.status(400).json({ error: 'tipo inválido' });

    const sql = tipo
    ? 'select id_categoria, nome_categoria, tipo from categoria where tipo = $1 order by nome_categoria'
    : 'select id_categoria, nome_categoria, tipo from categoria order by tipo, nome_categoria';

    const { rows } = await pool.query(sql, tipo? [tipo] : []);
    res.json(rows);
  } catch (e) {
    console.error('GET /api/categorias erro:', e);
    res.status(500).json({ error: 'Erro ao listar categorias' });
  }
}

app.get('/api/categorias', handleListCategorias);

// compativel com front antigo
app.get('/api/categorias/:id_usuario', handleListCategorias);

app.post('/api/transacoes', async (req, res) => {
  try {
    const { id_usuario, id_categoria, descricao, valor, tipo: tipoDoBody, data_transacao } = req.body;

    if (!id_usuario || !id_categoria) {
      return res.status(400).json({ error: 'id_usuario e id_categoria são obrigatórios' });
    }

    const cat = await pool.query(
      'select id_categoria, tipo from categoria where id_categoria = $1',
      [id_categoria]
    );
    if (!cat.rows.length) return res.status(400).json({ error: 'Categoria inexistente' });

    const tipoDaCategoria = cat.rows[0].tipo;

    const tipoFinal = tipoDoBody ?? tipoDaCategoria;
    if (tipoFinal !== tipoDaCategoria) {
      return res.status(400).json({ error: 'tipo da transação não corresponde ao tipo da categoria' });
    }

    const val = toNum(valor);
    if (!(val >= 0)) return res.status(400).json({ error: 'valor inválido' });

    const { rows } = await pool.query(
      `insert into transacao (id_usuario, id_categoria, descricao, valor, tipo, data_transacao)
       values ($1, $2, $3, $4, $5, coalesce($6::date, current_date))
       returning id_transacao`,
      [id_usuario, id_categoria, descricao ?? null, val, tipoFinal, data_transacao ?? null]
    );

    res.status(201).json({ id_transacao: rows[0].id_transacao });
  } catch (e) {
    console.error('POST /transacoes erro:', e);
    res.status(500).json({ error: 'Erro ao criar transação' });
  }
});

app.get('/api/transacoes/:id_usuario', async (req, res) => {
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

app.get('/api/analytics/sum-by-category/:id_usuario', async (req, res) => {
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

const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log(`API ouvindo em http://localhost:${port}`));