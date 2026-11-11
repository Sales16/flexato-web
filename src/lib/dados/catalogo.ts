import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ordenarPorRelevancia, palavrasDaBusca } from '@/lib/busca-catalogo';
import type { FonteCatalogo, VeiculoCatalogoApi } from '@/lib/tipos-api';

type LinhaCatalogo = {
	id: number;
	marca: string;
	modelo: string;
	versao: string;
	fonte: FonteCatalogo;
	edicao_pbev: string | null;
	etanol_cidade: number | string;
	etanol_estrada: number | string;
	gasolina_cidade: number | string;
	gasolina_estrada: number | string;
};

const COLUNAS = 'id, marca, modelo, versao, fonte, edicao_pbev, etanol_cidade, etanol_estrada, gasolina_cidade, gasolina_estrada';
const LIMITE_CANDIDATOS = 1000;

function paraApi(l: LinhaCatalogo): VeiculoCatalogoApi {
	return {
		id: l.id,
		marca: l.marca,
		modelo: l.modelo,
		versao: l.versao,
		fonte: l.fonte,
		edicaoPbev: l.edicao_pbev,
		consumo: {
			etanol: { cidade: Number(l.etanol_cidade), estrada: Number(l.etanol_estrada) },
			gasolina: { cidade: Number(l.gasolina_cidade), estrada: Number(l.gasolina_estrada) },
		},
	};
}

export async function buscarCatalogo(supabase: SupabaseClient, termo: string, limite: number): Promise<VeiculoCatalogoApi[]> {
	const palavras = palavrasDaBusca(termo);
	let consulta = supabase
		.from('veiculos_catalogo')
		.select(COLUNAS)
		.order('marca')
		.order('modelo')
		.order('versao')
		.limit(palavras.length ? LIMITE_CANDIDATOS : limite);
	for (const palavra of palavras) {
		consulta = consulta.ilike('busca', `%${palavra}%`);
	}
	const { data, error } = await consulta;
	if (error) throw error;
	const itens = (data as LinhaCatalogo[]).map(paraApi);
	return palavras.length ? ordenarPorRelevancia(itens, termo).slice(0, limite) : itens;
}
