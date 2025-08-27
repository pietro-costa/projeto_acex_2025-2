const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || res.statusText);
  }
  return res.json() as Promise<T>;
}

export type Categoria = {
  id_categoria: number;
  nome_categoria: string;
  tipo: "receita" | "despesa";
  id_usuario: number;
};

export type Transacao = {
  id_transacao: number;
  id_usuario: number;
  id_categoria: number;
  descricao: string | null;
  valor: number;
  tipo: "receita" | "despesa";
  data_transacao: string;
  criado_em: string;
};

export type SumByCategory = {
  nome_categoria: string;
  tipo: "receita" | "despesa";
  total: number | string;
};

export type Usuario = {
  id_usuario: number;
  nome: string;
  email: string;
  cpf: string;
  renda_fixa: number;
  gastos_fixos: number;
  data_criacao?: string;
};

export const getHealth = () => api<{ ok: boolean; db: boolean }>(`/api/health`);
export const getCategorias = (idUsuario: number) => api<Categoria[]>(`/api/categorias/${idUsuario}`);
export const getTransacoes = (idUsuario: number) => api<Transacao[]>(`/api/transacoes/${idUsuario}`);
export const postTransacao = (body: Partial<Transacao>) =>
  api<{ id_transacao: number }>(`/api/transacoes`, { method: "POST", body: JSON.stringify(body) });
export const getSumByCategory = (idUsuario: number) => api<SumByCategory[]>(`/api/analytics/sum-by-category/${idUsuario}`);

export const postUsuario = (u: Omit<Usuario, 'id_usuario'|'data_criacao'> & { senha?: string }) =>
  api<{ id_usuario: number }>(`/api/usuarios`, { method: "POST", body: JSON.stringify(u) });
export const getUsuario = (id: number) => api<Usuario>(`/api/usuarios/${id}`);
export const patchUsuario = (id: number, b: Partial<Usuario> & { senha?: string }) =>
  api<{ ok: boolean }>(`/api/usuarios/${id}`, { method: "PATCH", body: JSON.stringify(b) });

export { api };
