export const URL_MUNICIPIOS_IBGE = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado';

const CABECALHOS = { 'User-Agent': 'Mozilla/5.0 (compatible; Flexato/1.0)' };

export async function buscar(url: string): Promise<Response> {
	const resposta = await fetch(url, { headers: CABECALHOS, cache: 'no-store' });
	if (!resposta.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${resposta.status}`);
	return resposta;
}

export function emLotes<T>(itens: T[], tamanho: number): T[][] {
	if (!Number.isInteger(tamanho) || tamanho < 1) throw new Error('O tamanho do lote deve ser um inteiro positivo.');
	const lotes: T[][] = [];
	for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho));
	return lotes;
}
