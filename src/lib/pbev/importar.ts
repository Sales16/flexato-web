import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { lerTabelaPbev, urlTabelaMaisRecente, type TabelaPbev } from './parser';
import { lerItensPdf } from './pdf';

export const PAGINA_PBEV =
	'https://www.gov.br/inmetro/pt-br/assuntos/regulamentacao/avaliacao-da-conformidade/programa-brasileiro-de-etiquetagem/tabelas-de-eficiencia-energetica/veiculos-automotivos-pbe-veicular';
const CABECALHOS = { 'User-Agent': 'Mozilla/5.0 (compatible; Flexato/1.0)' };
const TAMANHO_LOTE = 200;

export type OrigemPbev = { url: string } | { arquivo: Uint8Array; nome: string };

async function buscar(url: string): Promise<Response> {
	const resposta = await fetch(url, { headers: CABECALHOS, cache: 'no-store' });
	if (!resposta.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${resposta.status}`);
	return resposta;
}

export async function urlPbevMaisRecente(): Promise<string> {
	const resposta = await buscar(PAGINA_PBEV);
	return urlTabelaMaisRecente(await resposta.text(), resposta.url || PAGINA_PBEV);
}

export async function lerPbev(origem: OrigemPbev): Promise<{ arquivo: string; tabela: TabelaPbev }> {
	const dados = 'url' in origem ? new Uint8Array(await (await buscar(origem.url)).arrayBuffer()) : origem.arquivo;
	const tabela = lerTabelaPbev(await lerItensPdf(dados));
	return { arquivo: 'url' in origem ? origem.url : origem.nome, tabela };
}

export async function gravarCatalogoPbev(supabase: SupabaseClient, tabela: TabelaPbev): Promise<{ gravados: number; exemplosRemovidos: number }> {
	if (!tabela.veiculos.length) throw new Error('A tabela PBEV não trouxe nenhum veículo flex. Nada foi gravado.');

	for (let i = 0; i < tabela.veiculos.length; i += TAMANHO_LOTE) {
		const lote = tabela.veiculos.slice(i, i + TAMANHO_LOTE).map(v => ({ ...v, fonte: 'inmetro' }));
		const { error } = await supabase.from('veiculos_catalogo').upsert(lote, { onConflict: 'marca,modelo,versao,fonte' });
		if (error) throw error;
	}

	const { error, count } = await supabase.from('veiculos_catalogo').delete({ count: 'exact' }).eq('fonte', 'exemplo');
	if (error) throw error;

	return { gravados: tabela.veiculos.length, exemplosRemovidos: count ?? 0 };
}
