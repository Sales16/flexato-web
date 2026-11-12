export const URL_MUNICIPIOS_IBGE = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado';

const CABECALHOS = { 'User-Agent': 'Mozilla/5.0 (compatible; Flexato/1.0)' };
export const TEMPO_LIMITE_PADRAO_MS = 60_000;

export async function buscar(url: string, opcoes: { tempoLimiteMs?: number } = {}): Promise<Response> {
	const signal = AbortSignal.timeout(opcoes.tempoLimiteMs ?? TEMPO_LIMITE_PADRAO_MS);
	const resposta = await fetch(url, { headers: CABECALHOS, cache: 'no-store', signal });
	if (!resposta.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${resposta.status}`);
	return resposta;
}

export function emLotes<T>(itens: T[], tamanho: number): T[][] {
	if (!Number.isInteger(tamanho) || tamanho < 1) throw new Error('O tamanho do lote deve ser um inteiro positivo.');
	const lotes: T[][] = [];
	for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho));
	return lotes;
}
