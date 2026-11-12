alter table public.veiculos_catalogo drop column busca;

alter table public.veiculos_catalogo
	add column busca text generated always as (
		lower(
			translate(
				marca || ' ' || modelo || ' ' || versao,
				'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ',
				'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn'
			)
		)
	) stored;

grant select on public.veiculos_catalogo to anon, authenticated;
grant select, insert, update, delete on public.veiculos_catalogo to service_role;
grant usage, select on all sequences in schema public to service_role;
