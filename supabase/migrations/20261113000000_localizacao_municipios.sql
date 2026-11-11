create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
grant usage on schema extensions to service_role;

create table public.municipios_ibge (
	codigo integer primary key check (codigo between 1100000 and 5399999),
	nome text not null,
	uf char(2) not null,
	geom extensions.geometry(MultiPolygon, 4326) not null,
	atualizado_em timestamptz not null default now()
);

create index municipios_ibge_geom_idx on public.municipios_ibge using gist (geom);
create index precos_municipio_semana_ibge_idx on public.precos_municipio (semana_fim, municipio_ibge);

alter table public.municipios_ibge enable row level security;

revoke all on public.municipios_ibge from anon, authenticated;
grant select, insert, update, delete on public.municipios_ibge to service_role;

create function public.municipio_por_ponto(lat double precision, lng double precision)
returns table (codigo integer, nome text, uf char(2))
language sql
stable
security invoker
set search_path = ''
as $$
	select m.codigo, m.nome, m.uf
	from public.municipios_ibge m
	where extensions.st_dwithin(m.geom, extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326), 0.02)
	order by m.geom operator(extensions.<->) extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)
	limit 1;
$$;

create function public.importar_municipios_ibge(itens jsonb)
returns integer
language sql
security invoker
set search_path = ''
as $$
	with entrada as (
		select (i ->> 'codigo')::integer as codigo, i ->> 'nome' as nome, i ->> 'uf' as uf, i -> 'geometria' as geometria
		from jsonb_array_elements(itens) as i
	),
	gravados as (
		insert into public.municipios_ibge (codigo, nome, uf, geom, atualizado_em)
		select
			e.codigo,
			e.nome,
			e.uf,
			extensions.st_multi(
				extensions.st_collectionextract(
					extensions.st_makevalid(extensions.st_setsrid(extensions.st_geomfromgeojson(e.geometria::text), 4326)),
					3
				)
			),
			now()
		from entrada e
		on conflict (codigo) do update
		set nome = excluded.nome, uf = excluded.uf, geom = excluded.geom, atualizado_em = excluded.atualizado_em
		returning 1
	)
	select count(*)::integer from gravados;
$$;

revoke execute on function public.municipio_por_ponto(double precision, double precision) from public, anon, authenticated;
revoke execute on function public.importar_municipios_ibge(jsonb) from public, anon, authenticated;
grant execute on function public.municipio_por_ponto(double precision, double precision) to service_role;
grant execute on function public.importar_municipios_ibge(jsonb) to service_role;
