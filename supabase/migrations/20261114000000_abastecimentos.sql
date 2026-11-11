create table public.abastecimentos (
	id uuid primary key default gen_random_uuid(),
	carro_id uuid not null references public.carros (id) on delete cascade,
	data date not null,
	combustivel text not null check (combustivel in ('etanol', 'gasolina')),
	litros numeric(6, 2) not null check (litros > 0 and litros < 1000),
	hodometro_km integer not null check (hodometro_km >= 0 and hodometro_km < 10000000),
	preco_litro numeric(6, 3) check (preco_litro > 0 and preco_litro < 100),
	tanque_cheio boolean not null default true,
	trecho text check (trecho in ('cidade', 'estrada', 'misto')),
	criado_em timestamptz not null default now()
);

create index abastecimentos_carro_data_idx on public.abastecimentos (carro_id, data, hodometro_km);

grant select, insert, update, delete on public.abastecimentos to authenticated;

alter table public.abastecimentos enable row level security;

create policy "dono do carro lê" on public.abastecimentos for select to authenticated
using (exists (select 1 from public.carros c where c.id = carro_id and c.user_id = (select auth.uid())));

create policy "dono do carro cria" on public.abastecimentos for insert to authenticated
with check (exists (select 1 from public.carros c where c.id = carro_id and c.user_id = (select auth.uid())));

create policy "dono do carro altera" on public.abastecimentos for update to authenticated
using (exists (select 1 from public.carros c where c.id = carro_id and c.user_id = (select auth.uid())))
with check (exists (select 1 from public.carros c where c.id = carro_id and c.user_id = (select auth.uid())));

create policy "dono do carro remove" on public.abastecimentos for delete to authenticated
using (exists (select 1 from public.carros c where c.id = carro_id and c.user_id = (select auth.uid())));
