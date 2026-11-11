import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buscar, emLotes } from '@/lib/http-externo';
import { lerTabelaPbev, urlTabelaMaisRecente, type TabelaPbev } from './parser';
import { lerItensPdf } from './pdf';

export const PAGINA_PBEV =
	'https://www.gov.br/inmetro/pt-br/assuntos/regulamentacao/avaliacao-da-conformidade/programa-brasileiro-de-etiquetagem/tabelas-de-eficiencia-energetica/veiculos-automotivos-pbe-veicular';
const TAMANHO_LOTE = 200;

export type OrigemPbev = { url: string } | { arquivo: Uint8Array; nome: string };

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

	for (const lote of emLotes(tabela.veiculos, TAMANHO_LOTE)) {
		const linhas = lote.map(v => ({ ...v, fonte: 'inmetro' }));
		const { error } = await supabase.from('veiculos_catalogo').upsert(linhas, { onConflict: 'marca,modelo,versao,fonte' });
		if (error) throw error;
	}

	const { error, count } = await supabase.from('veiculos_catalogo').delete({ count: 'exact' }).eq('fonte', 'exemplo');
	if (error) throw error;

	return { gravados: tabela.veiculos.length, exemplosRemovidos: count ?? 0 };
}
