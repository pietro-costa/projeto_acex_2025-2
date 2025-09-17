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

insert into categoria (nome_categoria, tipo) values
('Alimentação','despesa'),
('Educação','despesa'),
('Lazer','despesa'),
('Moradia','despesa'),
('Roupas e Acessórios','despesa'),
('Saúde','despesa'),
('Serviços','despesa'),
('Transporte','despesa'),
('Outros','despesa')
on conflict do nothing;

<<<<<<< HEAD
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
=======

ALTER TABLE usuario
  ADD COLUMN IF NOT EXISTS data_cadastro date NOT NULL DEFAULT CURRENT_DATE;


UPDATE usuario
SET data_cadastro = COALESCE(data_cadastro, CURRENT_DATE);
>>>>>>> 9d502db (correção do card 'conta criada há X dias' para usar data de cadastro real)
