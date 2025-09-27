CREATE TABLE IF NOT EXISTS usuario (
  id_usuario        BIGSERIAL PRIMARY KEY,
  nome              VARCHAR NOT NULL,
  email             VARCHAR NOT NULL,
  renda_fixa        NUMERIC(14,2) NOT NULL DEFAULT 0,
  gastos_fixos      NUMERIC(14,2) NOT NULL DEFAULT 0,
  meta_economia     NUMERIC(14,2) NOT NULL DEFAULT 0,
  senha             TEXT NOT NULL,
  created_at        DATE NOT NULL DEFAULT CURRENT_DATE,
  email_verificado  BOOLEAN NOT NULL DEFAULT FALSE,
  token_verificacao TEXT,
  token_expires_at  TIMESTAMPTZ,
  reset_token       TEXT,
  reset_expires_at  TIMESTAMPTZ,
  saldo_inicial     NUMERIC(14,2) NOT NULL DEFAULT 0,
  dia_pagamento     SMALLINT NOT NULL DEFAULT 1 CHECK (dia_pagamento BETWEEN 1 AND 31)
);

create table if not exists categoria (
  id_categoria   bigserial primary key,
  nome_categoria varchar(100) not null,
  tipo           varchar(20)  not null check (tipo in ('receita','despesa')),
  sistema        BOOLEAN NOT NULL DEFAULT FALSE,
  unique (nome_categoria, tipo)
);

create table if not exists transacao (
  id_transacao    bigserial primary key,
  id_usuario      bigint not null references usuario(id_usuario) on delete cascade,
  id_categoria    bigint not null references categoria(id_categoria),
  descricao       varchar(255),
  valor           numeric(12,2) not null check (valor>= 0),
  tipo            varchar(20)   not null check (tipo in ('receita','despesa')),
  data_transacao  date          not null default current_date
);

create index if not exists idx_usuario_token_verificacao
  on usuario(token_verificacao);

create index if not exists idx_usuario_reset_token
  on usuario(reset_token);

insert into categoria (nome_categoria, tipo, sistema) values
('Alimentação','despesa',FALSE),
  ('Educação','despesa',FALSE),
  ('Lazer','despesa',FALSE),
  ('Moradia','despesa',FALSE),
  ('Roupas e Acessórios','despesa',FALSE),
  ('Saúde','despesa',FALSE),
  ('Serviços','despesa',FALSE),
  ('Transporte','despesa',FALSE),
  ('Outros','despesa',FALSE),
  ('Auxílios/Benefícios','receita',FALSE),
  ('Bicos','receita',FALSE),
  ('Freelance','receita',FALSE),
  ('Prêmios e Sorteios','receita',FALSE),
  ('Presente Recebido','receita',FALSE),
  ('Outros','receita',FALSE),
  ('Ajuste Inicial','receita',TRUE),
  ('Salário','receita',TRUE),
  ('Gastos Fixos','despesa',TRUE),
  ('Saldo ao fim do mês anterior','receita',TRUE),
  ('Saldo ao fim do mês anterior','despesa',TRUE),
  ('Fatura do cartão','despesa',FALSE)
on conflict do nothing;