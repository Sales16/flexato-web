export type PosicaoFaixa = { percentual: number; fora: 'abaixo' | 'acima' | null };

export function posicaoNaFaixa(valor: number, min: number, max: number): PosicaoFaixa {
	if (valor < min) return { percentual: 0, fora: 'abaixo' };
	if (valor > max) return { percentual: 100, fora: 'acima' };
	return { percentual: ((valor - min) / (max - min)) * 100, fora: null };
}
