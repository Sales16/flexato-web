import { normalizarNome, ufPorNome, type Uf } from '@/lib/ufs';
import type { Combustivel } from '@/lib/calculo';

export type Celula = string | number | Date | null | undefined;

export type PrecoAnp = {
	semanaInicio: string;
	semanaFim: string;
	uf: Uf;
	produto: Combustivel;
	precoMedio: number;
	precoMin: number | null;
	precoMax: number | null;
	postos: number;
};

export type PrecoMunicipioAnp = PrecoAnp & {
	municipioChave: string;
};

const PRODUTOS: Record<string, Combustivel> = {
	'ETANOL HIDRATADO': 'etanol',
	'GASOLINA COMUM': 'gasolina',
};

const COLUNAS = {
	inicio: 'DATA INICIAL',
	fim: 'DATA FINAL',
	produto: 'PRODUTO',
	postos: 'NUMERO DE POSTOS PESQUISADOS',
	medio: 'PRECO MEDIO REVENDA',
	minimo: 'PRECO MINIMO REVENDA',
	maximo: 'PRECO MAXIMO REVENDA',
} as const;

const ARQUIVO_RESUMO = /resumo_semanal_lpc_(\d{4})[-_](\d{2})[-_](\d{2})[-_](\d{4})[-_](\d{2})[-_](\d{2})\.xlsx$/i;

export function urlResumoMaisRecente(html: string, paginaUrl: string): string {
	const candidatos: { fim: string; url: string }[] = [];
	for (const match of html.matchAll(/href="([^"]+\.xlsx)"/gi)) {
		const url = new URL(match[1], paginaUrl);
		const nome = url.pathname.split('/').pop() ?? '';
		const partes = ARQUIVO_RESUMO.exec(nome);
		if (!partes || url.protocol !== 'https:' || url.hostname !== 'www.gov.br') continue;
		candidatos.push({ fim: `${partes[4]}-${partes[5]}-${partes[6]}`, url: url.toString() });
	}
	if (!candidatos.length) throw new Error('Nenhum arquivo resumo_semanal_lpc encontrado na página da ANP.');
	candidatos.sort((a, b) => b.fim.localeCompare(a.fim));
	return candidatos[0].url;
}

function texto(celula: Celula): string {
	if (celula instanceof Date) return celula.toISOString().slice(0, 10);
	return celula === null || celula === undefined ? '' : String(celula).trim();
}

function numero(celula: Celula): number | null {
	if (typeof celula === 'number') return Number.isFinite(celula) ? celula : null;
	const t = texto(celula).replace(',', '.');
	if (!t) return null;
	const n = Number(t);
	return Number.isFinite(n) ? n : null;
}

function data(celula: Celula): string | null {
	if (celula instanceof Date) return celula.toISOString().slice(0, 10);
	const t = texto(celula);
	if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
	const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t);
	return br ? `${br[3]}-${br[2]}-${br[1]}` : null;
}

function indiceCabecalho(linhas: Celula[][]): { linha: number; colunas: Map<string, number> } {
	for (let i = 0; i < linhas.length; i++) {
		const nomes = linhas[i].map(c => normalizarNome(texto(c)));
		if (nomes.includes(COLUNAS.produto) && nomes.includes(COLUNAS.medio)) {
			return { linha: i, colunas: new Map(nomes.map((n, idx) => [n, idx])) };
		}
	}
	throw new Error('Cabeçalho com PRODUTO e PREÇO MÉDIO REVENDA não encontrado.');
}

function coluna(colunas: Map<string, number>, ...nomes: string[]): number {
	for (const nome of nomes) {
		const idx = colunas.get(nome);
		if (idx !== undefined) return idx;
	}
	throw new Error(`Coluna ${nomes.join(' / ')} não encontrada.`);
}

function lerLinhas(linhas: Celula[][], colunaUf: string[], colunaMunicipio: string | null) {
	const { linha, colunas } = indiceCabecalho(linhas);
	const idx = {
		inicio: coluna(colunas, COLUNAS.inicio),
		fim: coluna(colunas, COLUNAS.fim),
		uf: coluna(colunas, ...colunaUf),
		municipio: colunaMunicipio ? coluna(colunas, colunaMunicipio) : -1,
		produto: coluna(colunas, COLUNAS.produto),
		postos: coluna(colunas, COLUNAS.postos),
		medio: coluna(colunas, COLUNAS.medio),
		minimo: coluna(colunas, COLUNAS.minimo),
		maximo: coluna(colunas, COLUNAS.maximo),
	};

	const resultado: (PrecoAnp & { municipioChave?: string })[] = [];
	for (const row of linhas.slice(linha + 1)) {
		const produto = PRODUTOS[normalizarNome(texto(row[idx.produto]))];
		if (!produto) continue;
		const uf = ufPorNome(texto(row[idx.uf]));
		const semanaInicio = data(row[idx.inicio]);
		const semanaFim = data(row[idx.fim]);
		const precoMedio = numero(row[idx.medio]);
		if (!uf || !semanaInicio || !semanaFim || precoMedio === null || precoMedio <= 0) continue;
		resultado.push({
			semanaInicio,
			semanaFim,
			uf,
			produto,
			precoMedio,
			precoMin: numero(row[idx.minimo]),
			precoMax: numero(row[idx.maximo]),
			postos: Math.trunc(numero(row[idx.postos]) ?? 0),
			...(idx.municipio >= 0 ? { municipioChave: normalizarNome(texto(row[idx.municipio])) } : {}),
		});
	}
	return resultado;
}

export function lerAbaEstados(linhas: Celula[][]): PrecoAnp[] {
	return lerLinhas(linhas, ['ESTADOS', 'ESTADO'], null);
}

export function lerAbaMunicipios(linhas: Celula[][]): PrecoMunicipioAnp[] {
	return lerLinhas(linhas, ['ESTADO', 'ESTADOS'], 'MUNICIPIO').filter((p): p is PrecoMunicipioAnp => Boolean(p.municipioChave));
}
