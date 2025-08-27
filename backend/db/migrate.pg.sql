create table if not exists usuario (
  id_usuario     bigserial primary key,
  nome           varchar(100)  not null,
  email          varchar(254)  not null unique,
  senha          text          not null,
  renda_fixa     numeric(12,2) not null default 0 check (renda_fixa  >= 0),
  gastos_fixos   numeric(12,2) not null default 0 check (gastos_fixos >= 0),
  meta_economia  numeric(12,2) not null default 0 check (meta_economia >= 0)
);