import type { Combustivel } from '@/lib/calculo';
import type { FontePreco, PrecoCombustivelApi } from '@/lib/tipos-api';

export type LinhaPreco = {
	produto: Combustivel;
	preco_medio: number | string;
	preco_min: number | string | null;
	preco_max: number | string | null;
};

const numeroOuNulo = (v: number | string | null) => (v === null ? null : Number(v));

export function paraPreco(linha: LinhaPreco, fonte: FontePreco): PrecoCombustivelApi {
	return {
		precoMedio: Number(linha.preco_medio),
		precoMin: numeroOuNulo(linha.preco_min),
		precoMax: numeroOuNulo(linha.preco_max),
		fonte,
	};
}
