import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { chaveComparacao, nomeLegivel } from './municipios';
import { lerAbaEstados, lerAbaMunicipios, urlResumoMaisRecente } from './parser';
import { lerAbas } from './planilha';

export const PAGINA_ANP =
	'https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas';
const API_MUNICIPIOS_IBGE = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado';
const CABECALHOS = { 'User-Agent': 'Mozilla/5.0 (compatible; Flexato/1.0)' };
const TAMANHO_LOTE = 500;

export type ResultadoImportacao =
	| { status: 'ja_importado'; semanaFim: string; arquivoUrl: string }
	| { status: 'importado'; semanaFim: string; arquivoUrl: string; estados: number; municipios: number; municipiosSemIbge: number };

type MunicipioIbge = { id: number; nome: string };

async function buscar(url: string): Promise<Response> {
	const resposta = await fetch(url, { headers: CABECALHOS, cache: 'no-store' });
	if (!resposta.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${resposta.status}`);
	return resposta;
}

async function municipiosIbge(): Promise<Map<string, MunicipioIbge>> {
	const lista = (await (await buscar(API_MUNICIPIOS_IBGE)).json()) as { 'municipio-id': number; 'municipio-nome': string; 'UF-sigla': string }[];
	return new Map(lista.map(m => [chaveComparacao(m['UF-sigla'], m['municipio-nome']), { id: m['municipio-id'], nome: m['municipio-nome'] }]));
}

async function emLotes<T>(itens: T[], acao: (lote: T[]) => Promise<void>) {
	for (let i = 0; i < itens.length; i += TAMANHO_LOTE) await acao(itens.slice(i, i + TAMANHO_LOTE));
}

export async function importarPrecosAnp(supabase: SupabaseClient, opcoes: { forcar?: boolean } = {}): Promise<ResultadoImportacao> {
	const html = await (await buscar(PAGINA_ANP)).text();
	const arquivoUrl = urlResumoMaisRecente(html, PAGINA_ANP);

	const arquivo = await (await buscar(arquivoUrl)).arrayBuffer();
	const abas = await lerAbas(arquivo, ['ESTADOS', 'MUNICIPIOS']);
	const estados = lerAbaEstados(abas.ESTADOS);
	const municipios = lerAbaMunicipios(abas.MUNICIPIOS);
	if (!estados.length) throw new Error('A planilha da ANP não trouxe preços por estado.');

	const { semanaInicio, semanaFim } = estados[0];

	if (!opcoes.forcar) {
		const { data, error } = await supabase.from('importacoes_precos').select('semana_fim').eq('semana_fim', semanaFim).maybeSingle();
		if (error) throw error;
		if (data) return { status: 'ja_importado', semanaFim, arquivoUrl };
	}

	const ibge = await municipiosIbge();
	let municipiosSemIbge = 0;

	await emLotes(estados, async lote => {
		const { error } = await supabase.from('precos_uf').upsert(
			lote.map(p => ({
				semana_fim: p.semanaFim,
				semana_inicio: p.semanaInicio,
				uf: p.uf,
				produto: p.produto,
				preco_medio: p.precoMedio,
				preco_min: p.precoMin,
				preco_max: p.precoMax,
				postos: p.postos,
			})),
			{ onConflict: 'semana_fim,uf,produto' }
		);
		if (error) throw error;
	});

	const linhasMunicipio = municipios.map(p => {
		const oficial = ibge.get(chaveComparacao(p.uf, p.municipioChave));
		if (!oficial) municipiosSemIbge++;
		return {
			semana_fim: p.semanaFim,
			semana_inicio: p.semanaInicio,
			uf: p.uf,
			municipio_chave: p.municipioChave,
			municipio_nome: oficial?.nome ?? nomeLegivel(p.municipioChave),
			municipio_ibge: oficial?.id ?? null,
			produto: p.produto,
			preco_medio: p.precoMedio,
			preco_min: p.precoMin,
			preco_max: p.precoMax,
			postos: p.postos,
		};
	});

	await emLotes(linhasMunicipio, async lote => {
		const { error } = await supabase.from('precos_municipio').upsert(lote, { onConflict: 'semana_fim,uf,municipio_chave,produto' });
		if (error) throw error;
	});

	const { error } = await supabase
		.from('importacoes_precos')
		.upsert({ semana_fim: semanaFim, semana_inicio: semanaInicio, arquivo_url: arquivoUrl, importado_em: new Date().toISOString() });
	if (error) throw error;

	return { status: 'importado', semanaFim, arquivoUrl, estados: estados.length, municipios: linhasMunicipio.length, municipiosSemIbge };
}
