import type { Combustivel } from '@/lib/calculo';
import type { FontePreco, PontoHistoricoApi, Semana } from '@/lib/tipos-api';

export type LinhaPrecoSemanal = {
	semana_fim: string;
	produto: Combustivel;
	preco_medio: number | string;
	preco_min: number | string | null;
	preco_max: number | string | null;
};

export const SEMANAS_PADRAO = 12;
export const SEMANAS_MAXIMO = 104;

const numeroOuNulo = (v: number | string | null) => (v === null ? null : Number(v));

function ponto(semana: Semana, linha: LinhaPrecoSemanal, fonte: FontePreco): PontoHistoricoApi {
	return { semana, precoMedio: Number(linha.preco_medio), precoMin: numeroOuNulo(linha.preco_min), precoMax: numeroOuNulo(linha.preco_max), fonte };
}

export function montarSeries(semanas: Semana[], linhasUf: LinhaPrecoSemanal[], linhasMunicipio: LinhaPrecoSemanal[]): Record<Combustivel, PontoHistoricoApi[]> {
	const ordenadas = [...semanas].sort((a, b) => a.fim.localeCompare(b.fim));
	const chave = (l: LinhaPrecoSemanal) => `${l.semana_fim}|${l.produto}`;
	const doMunicipio = new Map(linhasMunicipio.map(l => [chave(l), l]));
	const daUf = new Map(linhasUf.map(l => [chave(l), l]));
	const series: Record<Combustivel, PontoHistoricoApi[]> = { etanol: [], gasolina: [] };

	for (const produto of ['etanol', 'gasolina'] as const) {
		for (const semana of ordenadas) {
			const k = `${semana.fim}|${produto}`;
			const municipio = doMunicipio.get(k);
			const uf = daUf.get(k);
			if (municipio) series[produto].push(ponto(semana, municipio, 'municipio'));
			else if (uf) series[produto].push(ponto(semana, uf, 'uf'));
		}
	}
	return series;
}
