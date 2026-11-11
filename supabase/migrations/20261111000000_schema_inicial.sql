create table public.importacoes_precos (
	semana_fim date primary key,
	semana_inicio date not null,
	arquivo_url text not null,
	importado_em timestamptz not null default now()
);

create table public.precos_uf (
	semana_fim date not null,
	semana_inicio date not null,
	uf char(2) not null,
	produto text not null check (produto in ('etanol', 'gasolina')),
	preco_medio numeric(6, 3) not null check (preco_medio > 0),
	preco_min numeric(6, 3),
	preco_max numeric(6, 3),
	postos integer not null default 0,
	primary key (semana_fim, uf, produto)
);

create table public.precos_municipio (
	semana_fim date not null,
	semana_inicio date not null,
	uf char(2) not null,
	municipio_chave text not null,
	municipio_nome text not null,
	municipio_ibge integer,
	produto text not null check (produto in ('etanol', 'gasolina')),
	preco_medio numeric(6, 3) not null check (preco_medio > 0),
	preco_min numeric(6, 3),
	preco_max numeric(6, 3),
	postos integer not null default 0,
	primary key (semana_fim, uf, municipio_chave, produto)
);

create index precos_municipio_semana_uf_idx on public.precos_municipio (semana_fim, uf);

create table public.veiculos_catalogo (
	id bigint generated always as identity primary key,
	marca text not null,
	modelo text not null,
	versao text not null,
	etanol_cidade numeric(4, 1) not null check (etanol_cidade > 0),
	etanol_estrada numeric(4, 1) not null check (etanol_estrada > 0),
	gasolina_cidade numeric(4, 1) not null check (gasolina_cidade > 0),
	gasolina_estrada numeric(4, 1) not null check (gasolina_estrada > 0),
	fonte text not null check (fonte in ('inmetro', 'exemplo')),
	edicao_pbev text,
	busca text generated always as (marca || ' ' || modelo || ' ' || versao) stored,
	unique (marca, modelo, versao, fonte)
);

create table public.carros (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
	nome text not null check (char_length(nome) between 1 and 60),
	catalogo_id bigint references public.veiculos_catalogo (id) on delete set null,
	etanol_cidade numeric(4, 1) not null check (etanol_cidade > 0 and etanol_cidade < 100),
	etanol_estrada numeric(4, 1) not null check (etanol_estrada > 0 and etanol_estrada < 100),
	gasolina_cidade numeric(4, 1) not null check (gasolina_cidade > 0 and gasolina_cidade < 100),
	gasolina_estrada numeric(4, 1) not null check (gasolina_estrada > 0 and gasolina_estrada < 100),
	criado_em timestamptz not null default now(),
	atualizado_em timestamptz not null default now()
);

create index carros_user_id_idx on public.carros (user_id);

create function public.tocar_atualizado_em() returns trigger
language plpgsql
set search_path = ''
as $$
begin
	new.atualizado_em := now();
	return new;
end;
$$;

create trigger carros_atualizado_em
before update on public.carros
for each row execute function public.tocar_atualizado_em();

grant select on public.importacoes_precos, public.precos_uf, public.precos_municipio, public.veiculos_catalogo to anon, authenticated;
grant select, insert, update, delete on public.carros to authenticated;
grant select, insert, update, delete on public.importacoes_precos, public.precos_uf, public.precos_municipio, public.veiculos_catalogo to service_role;
grant usage, select on all sequences in schema public to service_role;

alter table public.importacoes_precos enable row level security;
alter table public.precos_uf enable row level security;
alter table public.precos_municipio enable row level security;
alter table public.veiculos_catalogo enable row level security;
alter table public.carros enable row level security;

create policy "leitura pública" on public.importacoes_precos for select to anon, authenticated using (true);
create policy "leitura pública" on public.precos_uf for select to anon, authenticated using (true);
create policy "leitura pública" on public.precos_municipio for select to anon, authenticated using (true);
create policy "leitura pública" on public.veiculos_catalogo for select to anon, authenticated using (true);

create policy "dono lê" on public.carros for select to authenticated using ((select auth.uid()) = user_id);
create policy "dono cria" on public.carros for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "dono altera" on public.carros for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "dono remove" on public.carros for delete to authenticated using ((select auth.uid()) = user_id);
