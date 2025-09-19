const rawBase =
  (import.meta.env as any).VITE_API_URL;
const BASE = rawBase.replace(/\/+$/, "");

class ApiError extends Error {
  code?: string;
  status?: number;
  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const token = localStorage.getItem("token") ?? undefined;

  // normaliza os headers do init para objeto simples
  const initHeaders: Record<string, string> =
    init.headers instanceof Headers
      ? Object.fromEntries(init.headers.entries())
      : (init.headers as Record<string, string> | undefined) ?? {};

  // monta headers finais tipados (sem erro de TS)
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...initHeaders,
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...init, headers });

  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Falha na requisição");
  }
  return data as T;
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
  renda_fixa: number;
  gastos_fixos: number;
  dia_pagamento?: number;
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
  confirm_senha: string;
  renda_fixa: number | string;
  gastos_fixos: number | string;
  dia_pagamento: number | string;
  saldo_atual: number | string;
  meta_economia?: number | string;
};

export const postUsuario = (u: NewUsuario) =>
  api<{ id_usuario: number }>(`/api/usuarios`, {
    method: "POST",
    body: JSON.stringify(u),
  });

export const getUsuario = (id: number) => api<Usuario>(`/api/usuarios/${id}`);

export function postLogin(body: { email: string; senha: string }) {
  return api<{ token: string; user: any }>('/api/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export const patchUsuario = (
  id: number,
  b: (Partial<Usuario> & { senha?: string }) & { dia_pagamento?: number }
) =>
  api<{ ok: boolean; user?: Usuario }>(`/api/usuarios/${id}`, {
    method: "PATCH",
    body: JSON.stringify(b),
  });

export async function resendVerificationByEmail(email: string) {
  return api<{ message: string }>('/api/usuarios/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

// === ESQUECI MINHA SENHA ===
export function forgotPassword(email: string) {
  return api<{ ok: boolean; message?: string }>('/api/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, senha: string, confirm_senha: string) {
  return api<{ ok: boolean }>('/api/password-reset', {
    method: 'POST',
    body: JSON.stringify({ token, senha, confirm_senha }),
  });
}

export async function postGarantirMes(ym?: string) {
  return api<{ ok: boolean; message?: string }>("/api/mensal/garantir", {
    method: "POST",
    body: JSON.stringify(ym ? { ym } : {}),
  });
}

export { api };