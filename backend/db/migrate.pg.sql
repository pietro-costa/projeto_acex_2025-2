create table if not exists usuario (
  id_usuario     bigserial primary key,
  nome           varchar(100)  not null,
  email          varchar(254)  not null unique,
  senha          text          not null,
  renda_fixa     numeric(12,2) not null default 0 check (renda_fixa  >= 0),
  gastos_fixos   numeric(12,2) not null default 0 check (gastos_fixos >= 0),
  meta_economia  numeric(12,2) not null default 0 check (meta_economia >= 0)
);

create table if not exists categoria (
  id_categoria   bigserial primary key,
  nome_categoria varchar(100) not null,
  tipo           varchar(20)  not null check (tipo in ('receita','despesa')),
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

alter table if exists usuario
  add column if not exists email_verificado boolean not null default false,
  add column if not exists token_verificacao text,
  add column if not exists token_expires_at timestamptz;

create index if not exists idx_usuario_token_verificacao
  on usuario(token_verificacao);

alter table if exists usuario
  add column if not exists reset_token text,
  add column if not exists reset_expires_at timestamptz;

create index if not exists idx_usuario_reset_token
  on usuario(reset_token);

alter table if exists categoria
  add column if not exists sistema boolean not null default false;

insert into categoria (nome_categoria, tipo, sistema) values
('Alimentação','despesa', false),
('Educação','despesa', false),
('Fatura do cartão de crédito','despesa', false),
('Lazer','despesa', false),
('Moradia','despesa', false),
('Roupas e Acessórios','despesa', false),
('Saúde','despesa', false),
('Serviços','despesa', false),
('Transporte','despesa', false),
('Outros','despesa', false),
('Ajuste Inicial','receita', true),
('Salário','receita', true),
('Gastos Fixos','despesa', true),
('Saldo ao fim do mês anterior','receita', true),
('Saldo ao fim do mês anterior','despesa', true)
on conflict do nothing;

alter table if exists usuario
  add column if not exists saldo_inicial numeric(12,2) not null default 0,
  add column if not exists dia_pagamento smallint check (dia_pagamento between 1 and 28);