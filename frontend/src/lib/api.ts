const BASE = import.meta.env.VITE_API_URL;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || res.statusText);
  }
  return res.json() as Promise<T>;
}

export type Categoria = {
  id_categoria: number;
  nome_categoria: string;
  tipo: "receita" | "despesa";
};

export type Transacao = {
  id_transacao: number;
  id_usuario: number;
  id_categoria: number;
  nome_categoria?: string;
  descricao: string | null;
  valor: number;
  tipo: "receita" | "despesa";
  data_transacao: string;
  criado_em?: string;
};

export type SumByCategory = {
  nome_categoria: string;
  tipo: "receita" | "despesa";
  total: number | string;
};

export type SumByDay = { 
  label: string; 
  total: number | string 
};

export type SumByMonth = { 
  label: string; 
  total: number | string 
};

export type SumByYear = { 
  label: string; 
  total: number | string 
};

export type AccountStats = {
  dias_conta: number;
  total_gastos: number;
  economia_mes: number | string;
}

export type Usuario = {
  id_usuario: number;
  nome: string;
  email: string;
  cpf?: string;
  renda_fixa: number;
  gastos_fixos: number;
  meta_economia?: number;
  data_criacao?: string;
};

export const getHealth = () =>
  api<{ ok: boolean; db?: boolean; hasEnv?: boolean }>(`/api/health`);

export type TipoMov = 'despesa' | 'receita';

export const getCategorias = (tipo?: TipoMov) =>
  api<any[]>(`/api/categorias${tipo ? `?tipo=${tipo}` : ''}`);

export type NewTransacao = {
  id_usuario: number;
  id_categoria: number;
  valor: number | string;
  descricao?: string | null;
  data_transacao?: string;
  tipo: "receita" | "despesa";
};

export const postTransacao = (t: NewTransacao) =>
  api(`/api/transacoes`, {
    method: 'POST',
    body: JSON.stringify(t),
  });

export const getTransacoes = (idUsuario: number, tipo?: "despesa" | "receita") =>
  api<Transacao[]>(`/api/transacoes/${idUsuario}${tipo ? `?tipo=${tipo}` : ""}`);

export const getSumByCategory = (idUsuario: number, tipo?: "despesa" | "receita") =>
  api<SumByCategory[]>(
    `/api/analytics/sum-by-category/${idUsuario}${tipo ? `?tipo=${tipo}` : ""}`
  );

export const getSumByDay = (idUsuario: number, days = 7, tipo: "despesa" | "receita" = "despesa") =>
  api<SumByDay[]>(
    `/api/analytics/sum-by-day/${idUsuario}?days=${days}&tipo=${tipo}`
  );

export const getSumByMonth = (idUsuario: number, months = 6) =>
  api<SumByMonth[]>(`/api/analytics/sum-by-month/${idUsuario}?months=${months}`);

export const getSumByYear = (idUsuario: number, years = 3) =>
  api<SumByYear[]>(`/api/analytics/sum-by-year/${idUsuario}?years=${years}`);

export const getAccountStats = (idUsuario: number) =>
  api<AccountStats>(`/api/analytics/account-stats/${idUsuario}`);

export type NewUsuario = {
  nome: string;
  email: string;
  senha: string;
  renda_fixa: number | string;
  gastos_fixos: number | string;
  meta_economia?: number | string;
  cpf?: string;
};

export const postUsuario = (u: NewUsuario) =>
  api<{ id_usuario: number }>(`/api/usuarios`, {
    method: "POST",
    body: JSON.stringify(u),
  });

export const getUsuario = (id: number) => api<Usuario>(`/api/usuarios/${id}`);

export const postLogin = (email: string, senha: string) =>
  api<{ id_usuario: number; nome: string; email: string }>(`/api/login`, {
    method: "POST",
    body: JSON.stringify({ email, senha }),
  });

export const patchUsuario = (
  id: number,
  b: Partial<Usuario> & { senha?: string }
) =>
  api<{ ok: boolean }>(`/api/usuarios/${id}`, {
    method: "PATCH",
    body: JSON.stringify(b),
  });

export { api };