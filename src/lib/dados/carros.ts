import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Consumo } from '@/lib/calculo';
import type { CarroAlterar, CarroCriar } from '@/lib/esquemas';
import type { CarroApi } from '@/lib/tipos-api';

type LinhaCarro = {
	id: string;
	nome: string;
	catalogo_id: number | null;
	etanol_cidade: number | string;
	etanol_estrada: number | string;
	gasolina_cidade: number | string;
	gasolina_estrada: number | string;
	criado_em: string;
	atualizado_em: string;
};

const COLUNAS = 'id, nome, catalogo_id, etanol_cidade, etanol_estrada, gasolina_cidade, gasolina_estrada, criado_em, atualizado_em';

function paraApi(l: LinhaCarro): CarroApi {
	return {
		id: l.id,
		nome: l.nome,
		catalogoId: l.catalogo_id,
		consumo: {
			etanol: { cidade: Number(l.etanol_cidade), estrada: Number(l.etanol_estrada) },
			gasolina: { cidade: Number(l.gasolina_cidade), estrada: Number(l.gasolina_estrada) },
		},
		criadoEm: l.criado_em,
		atualizadoEm: l.atualizado_em,
	};
}

function colunasConsumo(consumo: Consumo) {
	return {
		etanol_cidade: consumo.etanol.cidade,
		etanol_estrada: consumo.etanol.estrada,
		gasolina_cidade: consumo.gasolina.cidade,
		gasolina_estrada: consumo.gasolina.estrada,
	};
}

export async function listarCarros(supabase: SupabaseClient): Promise<CarroApi[]> {
	const { data, error } = await supabase.from('carros').select(COLUNAS).order('criado_em');
	if (error) throw error;
	return (data as LinhaCarro[]).map(paraApi);
}

export async function criarCarro(supabase: SupabaseClient, carro: CarroCriar): Promise<CarroApi> {
	const { data, error } = await supabase
		.from('carros')
		.insert({ nome: carro.nome, catalogo_id: carro.catalogoId ?? null, ...colunasConsumo(carro.consumo) })
		.select(COLUNAS)
		.single();
	if (error) throw error;
	return paraApi(data as LinhaCarro);
}

export async function alterarCarro(supabase: SupabaseClient, id: string, alteracao: CarroAlterar): Promise<CarroApi | null> {
	const { data, error } = await supabase
		.from('carros')
		.update({
			...(alteracao.nome !== undefined ? { nome: alteracao.nome } : {}),
			...(alteracao.consumo ? colunasConsumo(alteracao.consumo) : {}),
			...(alteracao.consumoTrecho
				? { [`${alteracao.consumoTrecho.combustivel}_${alteracao.consumoTrecho.trecho}`]: alteracao.consumoTrecho.kmPorLitro }
				: {}),
		})
		.eq('id', id)
		.select(COLUNAS)
		.maybeSingle();
	if (error) throw error;
	return data ? paraApi(data as LinhaCarro) : null;
}

export async function removerCarro(supabase: SupabaseClient, id: string): Promise<boolean> {
	const { data, error } = await supabase.from('carros').delete().eq('id', id).select('id');
	if (error) throw error;
	return data.length > 0;
}
