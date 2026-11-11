import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Combustivel } from '@/lib/calculo';
import type { LocaisApi, MunicipioApi, PrecoCombustivelApi, PrecosApi, Semana } from '@/lib/tipos-api';
import { SIGLAS_UF, UFS, type Uf } from '@/lib/ufs';

type LinhaPreco = {
	produto: Combustivel;
	preco_medio: number | string;
	preco_min: number | string | null;
	preco_max: number | string | null;
};

const TAMANHO_PAGINA = 1000;

const numeroOuNulo = (v: number | string | null) => (v === null ? null : Number(v));

export async function semanaMaisRecente(supabase: SupabaseClient): Promise<Semana | null> {
	const { data, error } = await supabase
		.from('importacoes_precos')
		.select('semana_inicio, semana_fim')
		.order('semana_fim', { ascending: false })
		.limit(1)
		.maybeSingle();
	if (error) throw error;
	return data ? { inicio: data.semana_inicio, fim: data.semana_fim } : null;
}

export async function listarLocais(supabase: SupabaseClient): Promise<LocaisApi> {
	const semana = await semanaMaisRecente(supabase);
	const porUf = new Map<Uf, Map<string, MunicipioApi>>(SIGLAS_UF.map(uf => [uf, new Map()]));

	if (semana) {
		for (let inicio = 0; ; inicio += TAMANHO_PAGINA) {
			const { data, error } = await supabase
				.from('precos_municipio')
				.select('uf, municipio_chave, municipio_nome')
				.eq('semana_fim', semana.fim)
				.order('uf')
				.order('municipio_chave')
				.order('produto')
				.range(inicio, inicio + TAMANHO_PAGINA - 1);
			if (error) throw error;
			for (const linha of data) {
				porUf.get(linha.uf as Uf)?.set(linha.municipio_chave, { chave: linha.municipio_chave, nome: linha.municipio_nome });
			}
			if (data.length < TAMANHO_PAGINA) break;
		}
	}

	return {
		semana,
		ufs: SIGLAS_UF.map(sigla => ({
			sigla,
			nome: UFS[sigla],
			municipios: [...porUf.get(sigla)!.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
		})).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
	};
}

function paraPreco(linha: LinhaPreco, fonte: PrecoCombustivelApi['fonte']): PrecoCombustivelApi {
	return {
		precoMedio: Number(linha.preco_medio),
		precoMin: numeroOuNulo(linha.preco_min),
		precoMax: numeroOuNulo(linha.preco_max),
		fonte,
	};
}

export async function buscarPrecos(supabase: SupabaseClient, uf: Uf, municipioChave: string | null): Promise<PrecosApi | null> {
	const semana = await semanaMaisRecente(supabase);
	if (!semana) return null;

	const { data: linhasUf, error: erroUf } = await supabase
		.from('precos_uf')
		.select('produto, preco_medio, preco_min, preco_max')
		.eq('semana_fim', semana.fim)
		.eq('uf', uf);
	if (erroUf) throw erroUf;

	let municipio: MunicipioApi | null = null;
	let linhasMunicipio: LinhaPreco[] = [];
	if (municipioChave) {
		const { data, error } = await supabase
			.from('precos_municipio')
			.select('produto, preco_medio, preco_min, preco_max, municipio_nome')
			.eq('semana_fim', semana.fim)
			.eq('uf', uf)
			.eq('municipio_chave', municipioChave);
		if (error) throw error;
		linhasMunicipio = data as LinhaPreco[];
		if (data.length) municipio = { chave: municipioChave, nome: data[0].municipio_nome };
	}

	const precos: PrecosApi['precos'] = {};
	for (const produto of ['etanol', 'gasolina'] as const) {
		const doMunicipio = linhasMunicipio.find(l => l.produto === produto);
		const daUf = (linhasUf as LinhaPreco[]).find(l => l.produto === produto);
		if (doMunicipio) precos[produto] = paraPreco(doMunicipio, 'municipio');
		else if (daUf) precos[produto] = paraPreco(daUf, 'uf');
	}

	return { semana, uf, municipio, precos };
}
