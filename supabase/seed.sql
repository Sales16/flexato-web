insert into public.veiculos_catalogo (marca, modelo, versao, etanol_cidade, etanol_estrada, gasolina_cidade, gasolina_estrada, fonte)
values
	('Volkswagen', 'Polo', '1.0 TSI MT', 8.4, 10.0, 12.6, 14.8, 'exemplo'),
	('Chevrolet', 'Onix', '1.0 Turbo AT', 9.3, 11.4, 12.9, 15.6, 'exemplo'),
	('Hyundai', 'HB20', '1.0 MT', 9.8, 10.9, 13.6, 15.1, 'exemplo'),
	('Renault', 'Kwid', '1.0 MT', 10.5, 10.9, 14.9, 15.4, 'exemplo'),
	('Fiat', 'Strada', '1.3 MT', 8.4, 9.2, 12.2, 13.4, 'exemplo'),
	('Fiat', 'Argo', '1.0 MT', 9.6, 10.6, 13.4, 14.6, 'exemplo'),
	('Toyota', 'Corolla', '2.0 CVT', 7.4, 8.9, 11.0, 13.3, 'exemplo'),
	('Volkswagen', 'T-Cross', '1.0 TSI AT', 8.0, 9.4, 11.4, 13.2, 'exemplo')
on conflict (marca, modelo, versao, fonte) do nothing;
