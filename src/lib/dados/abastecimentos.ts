import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Combustivel } from '@/lib/calculo';
import type { Trecho } from '@/lib/consumo-real';
import type { AbastecimentoCriar } from '@/lib/esquemas';
import type { AbastecimentoApi } from '@/lib/tipos-api';

type LinhaAbastecimento = {
	id: string;
	carro_id: string;
	data: string;
	combustivel: Combustivel;
	litros: number | string;
	hodometro_km: number;
	preco_litro: number | string | null;
	tanque_cheio: boolean;
	trecho: Trecho | null;
	criado_em: string;
};

const TAMANHO_PAGINA = 1000;

const COLUNAS = 'id, carro_id, data, combustivel, litros, hodometro_km, preco_litro, tanque_cheio, trecho, criado_em';

function paraApi(l: LinhaAbastecimento): AbastecimentoApi {
	return {
		id: l.id,
		carroId: l.carro_id,
		data: l.data,
		combustivel: l.combustivel,
		litros: Number(l.litros),
		hodometroKm: Number(l.hodometro_km),
		precoLitro: l.preco_litro === null ? null : Number(l.preco_litro),
		tanqueCheio: l.tanque_cheio,
		trecho: l.trecho,
		criadoEm: l.criado_em,
	};
}

export async function carroExiste(supabase: SupabaseClient, carroId: string): Promise<boolean> {
	const { data, error } = await supabase.from('carros').select('id').eq('id', carroId).maybeSingle();
	if (error) throw error;
	return data !== null;
}

export async function listarAbastecimentos(supabase: SupabaseClient, carroId: string): Promise<AbastecimentoApi[]> {
	const linhas: LinhaAbastecimento[] = [];
	for (let inicio = 0; ; inicio += TAMANHO_PAGINA) {
		const { data, error } = await supabase
			.from('abastecimentos')
			.select(COLUNAS)
			.eq('carro_id', carroId)
			.order('data')
			.order('hodometro_km')
			.order('criado_em')
			.order('id')
			.range(inicio, inicio + TAMANHO_PAGINA - 1);
		if (error) throw error;
		linhas.push(...(data as LinhaAbastecimento[]));
		if (data.length < TAMANHO_PAGINA) break;
	}
	return linhas.map(paraApi);
}

export async function criarAbastecimento(supabase: SupabaseClient, carroId: string, entrada: AbastecimentoCriar): Promise<AbastecimentoApi> {
	const { data, error } = await supabase
		.from('abastecimentos')
		.insert({
			carro_id: carroId,
			data: entrada.data,
			combustivel: entrada.combustivel,
			litros: entrada.litros,
			hodometro_km: entrada.hodometroKm,
			preco_litro: entrada.precoLitro ?? null,
			tanque_cheio: entrada.tanqueCheio,
			trecho: entrada.trecho ?? null,
		})
		.select(COLUNAS)
		.single();
	if (error) throw error;
	return paraApi(data as LinhaAbastecimento);
}

export async function removerAbastecimento(supabase: SupabaseClient, carroId: string, id: string): Promise<boolean> {
	const { data, error } = await supabase.from('abastecimentos').delete().eq('id', id).eq('carro_id', carroId).select('id');
	if (error) throw error;
	return data.length > 0;
}
