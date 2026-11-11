import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
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

function termoSeguro(termo: string): string {
	return termo.replace(/[%_,().*\\]/g, ' ').trim();
}

export async function buscarCatalogo(supabase: SupabaseClient, termo: string, limite: number): Promise<VeiculoCatalogoApi[]> {
	let consulta = supabase.from('veiculos_catalogo').select(COLUNAS).order('marca').order('modelo').order('versao').limit(limite);
	for (const palavra of termoSeguro(termo).split(/\s+/).filter(Boolean)) {
		consulta = consulta.ilike('busca', `%${palavra}%`);
	}
	const { data, error } = await consulta;
	if (error) throw error;
	return (data as LinhaCatalogo[]).map(paraApi);
}
